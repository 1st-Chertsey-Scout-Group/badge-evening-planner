// Completion math for a badge's requirement tree. Pure and structural: it needs
// only ids and the choose-N shape, so both the full requirement tree (with text)
// and the lean models embedded on the browse page satisfy these interfaces.

export type BadgeType = 'activity' | 'staged' | 'challenge' | 'top'

// How achievable a requirement is for our troop at its HQ. See
// data/facility-profile.md and suitability.ts for the rollup to badge level.
export type Category = 'evening' | 'over-time' | 'unsuitable' | 'unknown'

export interface ProgressNode {
  id: string
  // a leaf done multiple times is tracked as `${id}#0`..`${id}#n-1`
  repeatTimes: number
  // 'all' children required, or "do N of them"
  requiredOfChildren: 'all' | number
  children: ProgressNode[]
  // leaf suitability; absent on branches (their verdict rolls up from children)
  category?: Category
}

export interface ProgressUnit {
  mandatory: ProgressNode[]
  optional: ProgressNode[]
  // choose this many of `optional` to qualify
  optionsToQualify: number
}

// A normal badge is one unit; a staged badge is a list of stage-units, each
// counting as a single completable step.
export interface ProgressModel {
  type: BadgeType
  unit?: ProgressUnit
  stages?: ProgressUnit[]
}

export type Ticked = ReadonlySet<string>

export interface Tally {
  done: number
  needed: number
  satisfied: boolean
}

export interface BadgeTally {
  done: number
  needed: number
  percent: number
  complete: boolean
  started: boolean
}

const sum = (ns: number[]): number => ns.reduce((a, b) => a + b, 0)

function leafDone(node: ProgressNode, ticked: Ticked): number {
  if (node.repeatTimes <= 1) return ticked.has(node.id) ? 1 : 0
  let n = 0
  for (let k = 0; k < node.repeatTimes; k++) if (ticked.has(`${node.id}#${k}`)) n++
  return n
}

export function nodeTally(node: ProgressNode, ticked: Ticked): Tally {
  if (node.children.length === 0) {
    const need = Math.max(node.repeatTimes, 1)
    const done = Math.min(leafDone(node, ticked), need)
    return { done, needed: need, satisfied: done >= need }
  }
  const kids = node.children.map((c) => nodeTally(c, ticked))
  if (node.requiredOfChildren === 'all') {
    return {
      done: sum(kids.map((k) => k.done)),
      needed: sum(kids.map((k) => k.needed)),
      satisfied: kids.every((k) => k.satisfied),
    }
  }
  // choose N of the children: each child counts as one unit toward N
  const n = node.requiredOfChildren
  const satisfiedCount = kids.filter((k) => k.satisfied).length
  return { done: Math.min(satisfiedCount, n), needed: n, satisfied: satisfiedCount >= n }
}

export function unitTally(unit: ProgressUnit, ticked: Ticked): Tally {
  const mand = unit.mandatory.map((n) => nodeTally(n, ticked))
  const opt = unit.optional.map((n) => nodeTally(n, ticked))
  const satisfiedOptional = opt.filter((o) => o.satisfied).length
  const q = Math.min(unit.optionsToQualify, unit.optional.length)
  return {
    done: sum(mand.map((m) => m.done)) + Math.min(satisfiedOptional, q),
    needed: sum(mand.map((m) => m.needed)) + q,
    satisfied: mand.every((m) => m.satisfied) && satisfiedOptional >= q,
  }
}

const pct = (done: number, needed: number): number =>
  needed === 0 ? 100 : Math.round((done / needed) * 100)

export function badgeTally(model: ProgressModel, ticked: Ticked): BadgeTally {
  if (model.stages) {
    // each stage is one completable step; % is stages cleared / total stages
    const done = model.stages.filter((s) => unitTally(s, ticked).satisfied).length
    const needed = model.stages.length
    return {
      done,
      needed,
      percent: pct(done, needed),
      complete: done === needed,
      started: done > 0 || hasAnyTick(model, ticked),
    }
  }
  const t = unitTally(model.unit ?? { mandatory: [], optional: [], optionsToQualify: 0 }, ticked)
  return {
    done: t.done,
    needed: t.needed,
    percent: pct(t.done, t.needed),
    complete: t.satisfied,
    started: t.done > 0,
  }
}

function hasAnyTick(model: ProgressModel, ticked: Ticked): boolean {
  const ids: string[] = []
  const walk = (n: ProgressNode) => {
    ids.push(n.id)
    n.children.forEach(walk)
  }
  const units = model.stages ?? (model.unit ? [model.unit] : [])
  for (const u of units) [...u.mandatory, ...u.optional].forEach(walk)
  return ids.some((id) => ticked.has(id) || [...ticked].some((t) => t.startsWith(`${id}#`)))
}
