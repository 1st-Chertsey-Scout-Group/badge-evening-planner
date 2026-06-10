// Build-time resolution of a badge's requirement refs into a nested tree, with
// markdown notes rendered to HTML. Server-only: imports astro:content, so never
// pull this into a client island (islands use progress.ts / coverage.ts).

import { getCollection, getEntry, type CollectionEntry } from 'astro:content'
import { md } from './markdown'
import { rewriteLinks } from './links'
import type { ProgressModel, ProgressNode, ProgressUnit } from './progress'
import type { ReqNode, ResolvedBadge, Stage, Unit } from './types'

type Ref = { collection: 'requirements'; id: string }

let _slugs: Set<string> | null = null
export async function getBadgeSlugs(): Promise<Set<string>> {
  if (!_slugs) _slugs = new Set((await getCollection('badges')).map((b) => b.id))
  return _slugs
}

function proseHtml(src: string, slugs: ReadonlySet<string>): string {
  return rewriteLinks(md(src), slugs)
}

// Render markdown to HTML with links resolved, for the Astro-side prose blocks
// (tips, safety, youth-shaped) that don't go through resolveBadge.
export async function renderProse(src: string | null | undefined): Promise<string> {
  return proseHtml(src ?? '', await getBadgeSlugs())
}

async function resolveNode(ref: Ref, slugs: ReadonlySet<string>): Promise<ReqNode> {
  const entry = await getEntry(ref)
  if (!entry) throw new Error(`missing requirement ${ref.id}`)
  const d = entry.data
  const children = await Promise.all(d.children.map((c) => resolveNode(c, slugs)))
  const suitability = d.suitability ?? 'unknown'
  return {
    id: entry.id,
    title: d.title,
    notesHtml: proseHtml(d.notes, slugs),
    optional: d.optional,
    repeatTimes: d.repeatTimes,
    requiredOfChildren: d.requiredOfChildren,
    suitability,
    // the rollup reads `category` on leaves only; branches derive from children
    category: children.length === 0 ? suitability : undefined,
    children,
  }
}

async function resolveUnit(
  mandatory: Ref[],
  optional: Ref[],
  optionsToQualify: number,
  requirementsIntro: string,
  optionsIntro: string,
  slugs: ReadonlySet<string>,
): Promise<Unit> {
  return {
    requirementsIntroHtml: proseHtml(requirementsIntro, slugs),
    optionsIntroHtml: proseHtml(optionsIntro, slugs),
    optionsToQualify,
    mandatory: await Promise.all(mandatory.map((r) => resolveNode(r, slugs))),
    optional: await Promise.all(optional.map((r) => resolveNode(r, slugs))),
  }
}

export async function resolveBadge(badge: CollectionEntry<'badges'>): Promise<ResolvedBadge> {
  const d = badge.data
  const slugs = await getBadgeSlugs()
  if (d.stages) {
    const stages: Stage[] = await Promise.all(
      d.stages.map(async (s) => ({
        label: s.label,
        threshold: s.threshold,
        // stages have no choose-N pool; every (rare) optional item is required
        ...(await resolveUnit(
          s.mandatory,
          s.optional,
          s.optional.length,
          s.requirementsIntro,
          s.optionsIntro,
          slugs,
        )),
      })),
    )
    return { slug: badge.id, type: d.type, stages }
  }
  return {
    slug: badge.id,
    type: d.type,
    unit: await resolveUnit(
      d.mandatory ?? [],
      d.optional ?? [],
      d.optionsToQualify ?? 0,
      d.requirementsIntro ?? '',
      d.optionsIntro ?? '',
      slugs,
    ),
  }
}

// Strip the text, leaving just the structure the browse page needs to compute %.
function leanNode(n: ReqNode): ProgressNode {
  return {
    id: n.id,
    repeatTimes: n.repeatTimes,
    requiredOfChildren: n.requiredOfChildren,
    category: n.category,
    children: n.children.map(leanNode),
  }
}

function leanUnit(u: Unit): ProgressUnit {
  return {
    optionsToQualify: u.optionsToQualify,
    mandatory: u.mandatory.map(leanNode),
    optional: u.optional.map(leanNode),
  }
}

export function leanModel(b: ResolvedBadge): ProgressModel {
  return b.stages
    ? { type: b.type, stages: b.stages.map(leanUnit) }
    : { type: b.type, unit: b.unit ? leanUnit(b.unit) : undefined }
}
