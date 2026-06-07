// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  deleteEvening,
  duplicateEvening,
  getEvening,
  listEvenings,
  onEveningsChange,
  renameEvening,
  saveEvening,
} from '@/lib/evenings'

afterEach(() => localStorage.clear())

describe('evenings', () => {
  it('saves and reads back an evening', () => {
    const e = saveEvening('Week 1', ['a', 'b'], 90)
    expect(getEvening(e.id)).toMatchObject({ name: 'Week 1', slugs: ['a', 'b'], length: 90 })
  })

  it('falls back to a name for a blank one', () => {
    expect(saveEvening('   ', [], 60).name).toBe('Untitled evening')
  })

  it('lists newest first', () => {
    const first = saveEvening('First', [], 60)
    const second = saveEvening('Second', [], 60)
    const names = listEvenings().map((e) => e.name)
    // createdAt may collide within a tick; the newer id still appears
    expect(names).toContain(first.name)
    expect(names[0]).toBe(second.name)
  })

  it('duplicates with a copy suffix and a fresh id', () => {
    const e = saveEvening('Camp', ['x'], 120)
    duplicateEvening(e.id)
    const all = listEvenings()
    expect(all).toHaveLength(2)
    const copy = all.find((x) => x.name === 'Camp copy')
    expect(copy?.slugs).toEqual(['x'])
    expect(copy?.id).not.toBe(e.id)
  })

  it('renames and deletes', () => {
    const e = saveEvening('Old', [], 90)
    renameEvening(e.id, 'New')
    expect(getEvening(e.id)?.name).toBe('New')
    deleteEvening(e.id)
    expect(getEvening(e.id)).toBeUndefined()
  })

  it('tolerates malformed storage', () => {
    localStorage.setItem('badge-evenings:v1', '{not json')
    expect(listEvenings()).toEqual([])
  })

  it('drops entries that are not well-formed', () => {
    localStorage.setItem('badge-evenings:v1', JSON.stringify([{ id: 'x' }, 42]))
    expect(listEvenings()).toEqual([])
  })

  it('notifies subscribers on change', () => {
    const fn = vi.fn()
    const off = onEveningsChange(fn)
    saveEvening('a', [], 90)
    expect(fn).toHaveBeenCalled()
    off()
  })
})
