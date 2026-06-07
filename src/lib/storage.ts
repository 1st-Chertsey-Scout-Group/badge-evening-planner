// Browser-only persistence for ticked requirements. One versioned key holds a
// map of badge slug -> ticked requirement ids. All reads tolerate missing or
// malformed data and fall back to empty.

import type { Ticked } from './progress'

const KEY = 'badge-progress:v1'
const CHANGE = 'badge-progress:change'

type Store = Record<string, string[]>

function read(): Store {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    return coerce(parsed)
  } catch {
    return {}
  }
}

function coerce(value: unknown): Store {
  if (!value || typeof value !== 'object') return {}
  const out: Store = {}
  for (const [slug, ids] of Object.entries(value as Record<string, unknown>)) {
    if (Array.isArray(ids)) out[slug] = ids.filter((x): x is string => typeof x === 'string')
  }
  return out
}

function write(store: Store): void {
  if (typeof localStorage === 'undefined') return
  const tidy: Store = {}
  for (const [slug, ids] of Object.entries(store)) if (ids.length) tidy[slug] = ids
  localStorage.setItem(KEY, JSON.stringify(tidy))
  dispatchEvent(new CustomEvent(CHANGE))
}

export function getTicked(slug: string): Set<string> {
  return new Set(read()[slug] ?? [])
}

export function getAllTicked(): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {}
  for (const [slug, ids] of Object.entries(read())) out[slug] = new Set(ids)
  return out
}

export function setTicked(slug: string, ticked: Ticked): void {
  const store = read()
  store[slug] = [...ticked]
  write(store)
}

export function resetBadge(slug: string): void {
  const store = read()
  delete store[slug]
  write(store)
}

export function resetAll(): void {
  write({})
}

export function exportProgress(): string {
  return JSON.stringify({ version: 1, badges: read() }, null, 2)
}

export function importProgress(json: string): void {
  const parsed: unknown = JSON.parse(json)
  const badges = (parsed as { badges?: unknown } | null)?.badges
  if (!badges || typeof badges !== 'object') throw new Error('Unrecognised progress file')
  write(coerce(badges))
}

// Fires on our own writes and on cross-tab storage events. Returns an unsubscribe.
export function onProgressChange(fn: () => void): () => void {
  addEventListener(CHANGE, fn)
  addEventListener('storage', fn)
  return () => {
    removeEventListener(CHANGE, fn)
    removeEventListener('storage', fn)
  }
}
