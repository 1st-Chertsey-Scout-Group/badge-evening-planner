// Browser-only saved evenings: named snapshots of a plan (its base slugs and
// target length). The live working set stays in plan.ts; saving copies it here,
// opening copies it back. A term's worth of plans, each reopenable. All reads
// tolerate missing or malformed data and fall back to empty.

const KEY = 'badge-evenings:v1'
const CHANGE = 'badge-evenings:change'

export interface Evening {
  id: string
  name: string
  slugs: string[]
  length: number
  createdAt: number
}

function isEvening(v: unknown): v is Evening {
  if (!v || typeof v !== 'object') return false
  const e = v as Record<string, unknown>
  return (
    typeof e.id === 'string' &&
    typeof e.name === 'string' &&
    Array.isArray(e.slugs) &&
    e.slugs.every((s) => typeof s === 'string') &&
    typeof e.length === 'number' &&
    typeof e.createdAt === 'number'
  )
}

function read(): Evening[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isEvening)
  } catch {
    return []
  }
}

function write(list: Evening[]): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(list))
  dispatchEvent(new CustomEvent(CHANGE))
}

function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${read().length}`
}

// Newest first. Reverse before the stable sort so same-tick saves still order
// newest-first rather than by insertion.
export function listEvenings(): Evening[] {
  return read().reverse().sort((a, b) => b.createdAt - a.createdAt)
}

export function getEvening(id: string): Evening | undefined {
  return read().find((e) => e.id === id)
}

export function saveEvening(name: string, slugs: string[], length: number): Evening {
  const evening: Evening = {
    id: newId(),
    name: name.trim() || 'Untitled evening',
    slugs: [...slugs],
    length,
    createdAt: Date.now(),
  }
  write([...read(), evening])
  return evening
}

export function duplicateEvening(id: string): void {
  const e = getEvening(id)
  if (e) saveEvening(`${e.name} copy`, e.slugs, e.length)
}

export function renameEvening(id: string, name: string): void {
  write(read().map((e) => (e.id === id ? { ...e, name: name.trim() || e.name } : e)))
}

export function deleteEvening(id: string): void {
  write(read().filter((e) => e.id !== id))
}

// Fires on our own writes and on cross-tab storage events. Returns an unsubscribe.
export function onEveningsChange(fn: () => void): () => void {
  addEventListener(CHANGE, fn)
  addEventListener('storage', fn)
  return () => {
    removeEventListener(CHANGE, fn)
    removeEventListener('storage', fn)
  }
}
