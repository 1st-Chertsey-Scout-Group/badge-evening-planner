// Build-time resolution of a badge's requirement refs into a nested tree, with
// markdown notes rendered to HTML. Server-only: imports astro:content, so never
// pull this into a client island (islands use progress.ts / storage.ts).

import { getEntry, type CollectionEntry } from 'astro:content'
import { md } from './markdown'
import type { ProgressModel, ProgressNode, ProgressUnit } from './progress'
import type { ReqNode, ResolvedBadge, Stage, Unit } from './types'

type Ref = { collection: 'requirements'; id: string }

async function resolveNode(ref: Ref): Promise<ReqNode> {
  const entry = await getEntry(ref)
  if (!entry) throw new Error(`missing requirement ${ref.id}`)
  const d = entry.data
  return {
    id: entry.id,
    title: d.title,
    notesHtml: md(d.notes),
    optional: d.optional,
    repeatTimes: d.repeatTimes,
    requiredOfChildren: d.requiredOfChildren,
    children: await Promise.all(d.children.map(resolveNode)),
  }
}

async function resolveUnit(
  mandatory: Ref[],
  optional: Ref[],
  optionsToQualify: number,
  requirementsIntro: string,
  optionsIntro: string,
): Promise<Unit> {
  return {
    requirementsIntroHtml: md(requirementsIntro),
    optionsIntroHtml: md(optionsIntro),
    optionsToQualify,
    mandatory: await Promise.all(mandatory.map(resolveNode)),
    optional: await Promise.all(optional.map(resolveNode)),
  }
}

export async function resolveBadge(badge: CollectionEntry<'badges'>): Promise<ResolvedBadge> {
  const d = badge.data
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
    ),
  }
}

// Strip the text, leaving just the structure the browse page needs to compute %.
function leanNode(n: ReqNode): ProgressNode {
  return {
    id: n.id,
    repeatTimes: n.repeatTimes,
    requiredOfChildren: n.requiredOfChildren,
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
