// Plan-driven coverage for a badge. Pure and island-safe: given a badge's
// progress model and the leaf ids the bases in the current plan would cover, it
// works out completion and per-requirement state. Sits on top of progress.ts
// and never touches storage or astro:content. The plan is the only source of
// "done" - there is no manual progress.

import {
  badgeTally,
  type BadgeTally,
  type ProgressModel,
  type ProgressNode,
  type ProgressUnit,
} from './progress'

function units(model: ProgressModel): ProgressUnit[] {
  return model.stages ?? (model.unit ? [model.unit] : [])
}

function leaves(model: ProgressModel): ProgressNode[] {
  const out: ProgressNode[] = []
  const walk = (n: ProgressNode) => (n.children.length ? n.children.forEach(walk) : out.push(n))
  units(model).forEach((u) => [...u.mandatory, ...u.optional].forEach(walk))
  return out
}

// Turn covered leaf ids into the tick keys progress.ts expects. A covered leaf
// that must be done several times counts as fully done (coverage, not per-scout
// counting).
export function coveredTicks(model: ProgressModel, covered: ReadonlySet<string>): Set<string> {
  const out = new Set<string>()
  for (const n of leaves(model)) {
    if (!covered.has(n.id)) continue
    if (n.repeatTimes > 1) for (let k = 0; k < n.repeatTimes; k++) out.add(`${n.id}#${k}`)
    else out.add(n.id)
  }
  return out
}

export type ReqState = 'covered' | 'missing'

export interface BadgeCoverage {
  tally: BadgeTally
  // per leaf id: covered by the plan, or still missing
  states: Record<string, ReqState>
}

export function badgeCoverage(model: ProgressModel, covered: ReadonlySet<string>): BadgeCoverage {
  const states: Record<string, ReqState> = {}
  for (const n of leaves(model)) states[n.id] = covered.has(n.id) ? 'covered' : 'missing'
  return { tally: badgeTally(model, coveredTicks(model, covered)), states }
}

// The plan stores base slugs; each base knows which leaf requirements it covers
// and for which badge. The leaf ids a plan covers for one badge.
interface PlanBase {
  slug: string
  covers: { reqId: string; badgeSlug: string }[]
}

export function coveredLeavesForBadge(
  badgeSlug: string,
  plan: ReadonlySet<string>,
  bases: PlanBase[],
): Set<string> {
  const out = new Set<string>()
  for (const b of bases) {
    if (!plan.has(b.slug)) continue
    for (const c of b.covers) if (c.badgeSlug === badgeSlug) out.add(c.reqId)
  }
  return out
}

// One deduped equipment list for an evening, keyed case-insensitively but
// keeping the first-seen wording. Counts how many bases call for each item.
export function kitList(bases: { equipment: string[] }[]): { item: string; count: number }[] {
  const order: string[] = []
  const byKey = new Map<string, { item: string; count: number }>()
  for (const b of bases)
    for (const raw of b.equipment) {
      const key = raw.trim().toLowerCase()
      if (!key) continue
      const e = byKey.get(key)
      if (e) e.count++
      else {
        byKey.set(key, { item: raw, count: 1 })
        order.push(key)
      }
    }
  return order.map((k) => byKey.get(k)!)
}
