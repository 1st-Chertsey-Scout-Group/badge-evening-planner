// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addToPlan,
  clearPlan,
  getPlan,
  inPlan,
  onPlanChange,
  removeFromPlan,
  togglePlan,
} from '@/lib/plan'

afterEach(() => localStorage.clear())

describe('plan', () => {
  it('adds and reads back base slugs', () => {
    addToPlan('dealing-with-burns')
    addToPlan('dealing-with-choking')
    expect(getPlan()).toEqual(new Set(['dealing-with-burns', 'dealing-with-choking']))
    expect(inPlan('dealing-with-burns')).toBe(true)
    expect(inPlan('nope')).toBe(false)
  })

  it('dedupes a re-added slug', () => {
    addToPlan('dealing-with-burns')
    addToPlan('dealing-with-burns')
    expect([...getPlan()]).toEqual(['dealing-with-burns'])
  })

  it('removes and toggles', () => {
    addToPlan('a')
    addToPlan('b')
    removeFromPlan('a')
    expect(getPlan()).toEqual(new Set(['b']))
    togglePlan('a', true)
    expect(inPlan('a')).toBe(true)
    togglePlan('a', false)
    expect(inPlan('a')).toBe(false)
  })

  it('clears the whole plan', () => {
    addToPlan('a')
    clearPlan()
    expect(getPlan()).toEqual(new Set())
  })

  it('tolerates malformed storage', () => {
    localStorage.setItem('badge-plan:v1', '{not json')
    expect(getPlan()).toEqual(new Set())
  })

  it('notifies subscribers on change', () => {
    const fn = vi.fn()
    const off = onPlanChange(fn)
    addToPlan('a')
    expect(fn).toHaveBeenCalled()
    off()
  })
})
