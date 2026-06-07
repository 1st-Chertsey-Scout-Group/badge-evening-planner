// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  exportProgress,
  getAllTicked,
  getTicked,
  importProgress,
  onProgressChange,
  resetAll,
  resetBadge,
  setTicked,
} from '@/lib/storage'

afterEach(() => localStorage.clear())

describe('storage', () => {
  it('round-trips ticked ids per badge', () => {
    setTicked('chef', new Set(['1', '2']))
    expect(getTicked('chef')).toEqual(new Set(['1', '2']))
    expect(getTicked('other')).toEqual(new Set())
  })

  it('returns all ticked badges', () => {
    setTicked('chef', new Set(['1']))
    setTicked('swimmer', new Set(['2', '3']))
    expect(getAllTicked()).toEqual({ chef: new Set(['1']), swimmer: new Set(['2', '3']) })
  })

  it('drops empty entries', () => {
    setTicked('chef', new Set(['1']))
    setTicked('chef', new Set())
    expect(getTicked('chef')).toEqual(new Set())
    expect(getAllTicked()).toEqual({})
  })

  it('resets one badge and all', () => {
    setTicked('chef', new Set(['1']))
    setTicked('swimmer', new Set(['2']))
    resetBadge('chef')
    expect(getTicked('chef')).toEqual(new Set())
    expect(getTicked('swimmer')).toEqual(new Set(['2']))
    resetAll()
    expect(getAllTicked()).toEqual({})
  })

  it('exports and imports a roundtrip', () => {
    setTicked('chef', new Set(['1', '2']))
    const dump = exportProgress()
    resetAll()
    importProgress(dump)
    expect(getTicked('chef')).toEqual(new Set(['1', '2']))
  })

  it('rejects an unrecognised import', () => {
    expect(() => importProgress('{"nope":true}')).toThrow()
  })

  it('tolerates malformed storage', () => {
    localStorage.setItem('badge-progress:v1', '{not json')
    expect(getTicked('chef')).toEqual(new Set())
  })

  it('notifies subscribers on change', () => {
    const fn = vi.fn()
    const off = onProgressChange(fn)
    setTicked('chef', new Set(['1']))
    expect(fn).toHaveBeenCalled()
    off()
  })
})
