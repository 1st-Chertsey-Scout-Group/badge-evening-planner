// Coverage preview for the evening planner. Pure and island-safe: given a
// badge's progress model, the requirements already ticked, and the leaf ids a
// selected set of bases would cover, it works out what an evening adds. Sits on
// top of progress.ts and never touches storage or astro:content.

import {
  badgeTally,
  nodeTally,
  type BadgeTally,
  type ProgressModel,
  type ProgressNode,
  type ProgressUnit,
  type Ticked,
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

export type ReqState = 'done' | 'covered' | 'missing'

export interface BadgePreview {
  // completion from ticks alone vs ticks plus the planned bases
  current: BadgeTally
  projected: BadgeTally
  // per leaf id: already ticked, would be covered by the plan, or still missing
  states: Record<string, ReqState>
}

export function badgePreview(
  model: ProgressModel,
  manual: Ticked,
  covered: ReadonlySet<string>,
): BadgePreview {
  const combined = new Set<string>([...manual, ...coveredTicks(model, covered)])
  const states: Record<string, ReqState> = {}
  for (const n of leaves(model)) {
    states[n.id] = nodeTally(n, manual).satisfied
      ? 'done'
      : covered.has(n.id)
        ? 'covered'
        : 'missing'
  }
  return {
    current: badgeTally(model, manual),
    projected: badgeTally(model, combined),
    states,
  }
}

// One deduped equipment list for an evening, keyed case-insensitively but
// keeping the first-seen wording.
export function kitList(bases: { equipment: string[] }[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const b of bases)
    for (const item of b.equipment) {
      const key = item.trim().toLowerCase()
      if (key && !seen.has(key)) {
        seen.add(key)
        out.push(item)
      }
    }
  return out
}
