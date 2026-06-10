// Rolls leaf suitability up to a badge or stage verdict, and holds the display
// metadata shared by every surface that shows a category. Pure and island-safe:
// it reads only the structural progress model, so both the build pages and the
// client islands use it.
//
// Leaf categories are our troop's profile (see data/facility-profile.md). The
// rollup answers "what is the cheapest way to actually qualify?": a unit is
// `evening` if it can be qualified using only evening leaves, `over-time` if it
// needs over-time leaves too, and so on. unknown ranks above unsuitable so a
// badge that is only blocked by an unclassified leaf reads as needs-review, not
// as a confident no.

import type { Category, ProgressModel, ProgressNode, ProgressUnit } from './progress'

// Lower is more achievable. A leaf is reachable within a verdict when its tier
// is at or below that verdict's tier.
const TIER: Record<Category, number> = {
  evening: 0,
  'over-time': 1,
  unknown: 2,
  unsuitable: 3,
}

// Search order from most to least achievable; the first reachable tier wins.
const ORDER: Category[] = ['evening', 'over-time', 'unknown', 'unsuitable']

const tierOf = (c: Category | undefined): number => TIER[c ?? 'unknown']

// Can this node be satisfied using only leaves whose tier is <= max?
function nodeReachable(node: ProgressNode, max: number): boolean {
  if (node.children.length === 0) return tierOf(node.category) <= max
  if (node.requiredOfChildren === 'all') return node.children.every((c) => nodeReachable(c, max))
  const n = node.requiredOfChildren
  return node.children.filter((c) => nodeReachable(c, max)).length >= n
}

function unitReachable(unit: ProgressUnit, max: number): boolean {
  const q = Math.min(unit.optionsToQualify, unit.optional.length)
  return (
    unit.mandatory.every((n) => nodeReachable(n, max)) &&
    unit.optional.filter((n) => nodeReachable(n, max)).length >= q
  )
}

export function unitVerdict(unit: ProgressUnit): Category {
  for (const c of ORDER) if (unitReachable(unit, TIER[c])) return c
  return 'unsuitable'
}

// One verdict per stage, in order; empty for non-staged badges.
export function stageVerdicts(model: ProgressModel): Category[] {
  return (model.stages ?? []).map(unitVerdict)
}

// A staged badge's verdict is its most achievable stage: if any stage can be
// earned in an evening, the badge can be started in one.
export function badgeVerdict(model: ProgressModel): Category {
  if (model.stages) {
    return model.stages
      .map(unitVerdict)
      .reduce((best, v) => (TIER[v] < TIER[best] ? v : best), 'unsuitable' as Category)
  }
  return model.unit ? unitVerdict(model.unit) : 'unknown'
}

export interface SuitMeta {
  label: string
  // short label for tight chips
  short: string
  // tailwind classes for a pill and a dot
  chip: string
  dot: string
}

export const SUIT_META: Record<Category, SuitMeta> = {
  evening: {
    label: 'Doable in an evening',
    short: 'Evening',
    chip: 'bg-scout-green/10 text-scout-green',
    dot: 'bg-scout-green',
  },
  'over-time': {
    label: 'Needs several sessions',
    short: 'Over time',
    chip: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
  },
  unsuitable: {
    label: "Can't run at our HQ",
    short: "Can't run",
    chip: 'bg-scout-red/10 text-scout-red',
    dot: 'bg-scout-red',
  },
  unknown: {
    label: 'Unclassified',
    short: 'Unclassified',
    chip: 'bg-slate-100 text-slate-500',
    dot: 'bg-slate-300',
  },
}

// Filter/legend order for the browser.
export const SUIT_ORDER: Category[] = ['evening', 'over-time', 'unsuitable', 'unknown']
