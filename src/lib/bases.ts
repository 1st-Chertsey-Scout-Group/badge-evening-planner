// Build-time resolution of the bases collection. Server-only: imports
// astro:content, so never pull this into a client island (islands take the
// plain BaseSummary / TouchedBadge shapes below as props).
//
// reference() in the schema only checks a requirement id exists; the leaf check
// lives here, so a base pointing at a 'do all' / 'choose N' parent fails the
// build the first time a page resolves bases.

import { getCollection, getEntry, type CollectionEntry } from 'astro:content'
import { getImage } from 'astro:assets'
import { leanModel, resolveBadge } from './resolve'
import type { ProgressModel } from './progress'
import type { ReqNode } from './types'

export interface Cover {
  reqId: string
  reqTitle: string
  badgeSlug: string
  badgeTitle: string
}

export interface BaseSummary {
  slug: string
  title: string
  description: string
  duration: number
  equipment: string[]
  tags: string[]
  covers: Cover[]
}

export interface TouchedBadge {
  slug: string
  title: string
  img: { src: string; alt: string }
  model: ProgressModel
}

let _titles: Map<string, string> | null = null
async function badgeTitles(): Promise<Map<string, string>> {
  if (!_titles) _titles = new Map((await getCollection('badges')).map((b) => [b.id, b.data.title]))
  return _titles
}

async function coverOf(
  ref: { collection: 'requirements'; id: string },
  titles: Map<string, string>,
): Promise<Cover> {
  const entry = await getEntry(ref)
  if (!entry) throw new Error(`base references missing requirement ${ref.id}`)
  if (entry.data.children.length > 0)
    throw new Error(
      `base references non-leaf requirement ${ref.id} ("${entry.data.title}"); bases must point at leaf requirements`,
    )
  const badgeSlug = entry.data.badge.id
  return {
    reqId: entry.id,
    reqTitle: entry.data.title,
    badgeSlug,
    badgeTitle: titles.get(badgeSlug) ?? badgeSlug,
  }
}

export async function resolveBase(entry: CollectionEntry<'bases'>): Promise<BaseSummary> {
  const titles = await badgeTitles()
  const d = entry.data
  return {
    slug: entry.id,
    title: d.title,
    description: d.description,
    duration: d.duration,
    equipment: d.equipment,
    tags: d.tags,
    covers: await Promise.all(d.requirements.map((r) => coverOf(r, titles))),
  }
}

export async function allBaseSummaries(): Promise<BaseSummary[]> {
  const bases = await getCollection('bases')
  const out = await Promise.all(bases.map(resolveBase))
  return out.sort((a, b) => a.title.localeCompare(b.title))
}

export async function basesForBadge(slug: string): Promise<BaseSummary[]> {
  return (await allBaseSummaries()).filter((b) => b.covers.some((c) => c.badgeSlug === slug))
}

export interface TreeNode {
  id: string
  title: string
  children: TreeNode[]
}

export interface BadgeTree {
  slug: string
  title: string
  // one group per stage for staged badges, otherwise a single unnamed group
  groups: { label: string; nodes: TreeNode[] }[]
}

function trim(n: ReqNode): TreeNode {
  return { id: n.id, title: n.title, children: n.children.map(trim) }
}

// The requirement tree (ids + titles only) the base builder renders so you can
// tick leaf requirements. Served as static JSON per badge.
export async function badgeTree(entry: CollectionEntry<'badges'>): Promise<BadgeTree> {
  const r = await resolveBadge(entry)
  const groups = r.stages
    ? r.stages.map((s) => ({ label: s.label, nodes: [...s.mandatory, ...s.optional].map(trim) }))
    : [{ label: '', nodes: r.unit ? [...r.unit.mandatory, ...r.unit.optional].map(trim) : [] }]
  return { slug: entry.id, title: entry.data.title, groups }
}

// Lean models (plus name and icon) for every badge any base touches - the data
// the planner needs to compute coverage client-side.
export async function touchedBadges(): Promise<TouchedBadge[]> {
  const summaries = await allBaseSummaries()
  const touched = new Set(summaries.flatMap((b) => b.covers.map((c) => c.badgeSlug)))
  const badges = await getCollection('badges')
  const out: TouchedBadge[] = []
  for (const b of badges) {
    if (!touched.has(b.id)) continue
    const img = await getImage({ src: b.data.image.src, width: 96 })
    out.push({
      slug: b.id,
      title: b.data.title,
      img: { src: img.src, alt: b.data.image.alt },
      model: leanModel(await resolveBadge(b)),
    })
  }
  return out
}
