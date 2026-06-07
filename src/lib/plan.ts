// Browser-only "current plan" cart: the base slugs selected for the evening you
// are putting together. One transient working set, not a saved named evening -
// it survives navigation and reload until cleared. The plan is the only source
// of completion - what a badge has "done" is what the planned bases cover.

const KEY = 'badge-plan:v1'
const LENGTH_KEY = 'badge-plan-length:v1'
const CHANGE = 'badge-plan:change'

// Target length of the evening being planned, in minutes. The plan board shows
// the selected bases against it (under or over). Default for a fresh plan.
export const DEFAULT_LENGTH = 90

function read(): string[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x): x is string => typeof x === 'string')
  } catch {
    return []
  }
}

function write(slugs: string[]): void {
  if (typeof localStorage === 'undefined') return
  // dedupe, preserving order
  const seen = new Set<string>()
  const tidy = slugs.filter((s) => (seen.has(s) ? false : (seen.add(s), true)))
  localStorage.setItem(KEY, JSON.stringify(tidy))
  dispatchEvent(new CustomEvent(CHANGE))
}

export function getPlan(): Set<string> {
  return new Set(read())
}

export function inPlan(slug: string): boolean {
  return read().includes(slug)
}

export function addToPlan(slug: string): void {
  write([...read(), slug])
}

export function removeFromPlan(slug: string): void {
  write(read().filter((s) => s !== slug))
}

export function togglePlan(slug: string, on: boolean): void {
  if (on) addToPlan(slug)
  else removeFromPlan(slug)
}

export function clearPlan(): void {
  write([])
}

// Replace the whole cart in one write, e.g. when opening a saved evening.
export function setPlan(slugs: string[]): void {
  write(slugs)
}

export function getPlanLength(): number {
  if (typeof localStorage === 'undefined') return DEFAULT_LENGTH
  const n = Number.parseInt(localStorage.getItem(LENGTH_KEY) ?? '', 10)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_LENGTH
}

export function setPlanLength(mins: number): void {
  if (typeof localStorage === 'undefined') return
  if (!Number.isFinite(mins) || mins <= 0) return
  localStorage.setItem(LENGTH_KEY, String(Math.round(mins)))
  dispatchEvent(new CustomEvent(CHANGE))
}

// Fires on our own writes and on cross-tab storage events. Returns an unsubscribe.
export function onPlanChange(fn: () => void): () => void {
  addEventListener(CHANGE, fn)
  addEventListener('storage', fn)
  return () => {
    removeEventListener(CHANGE, fn)
    removeEventListener('storage', fn)
  }
}
