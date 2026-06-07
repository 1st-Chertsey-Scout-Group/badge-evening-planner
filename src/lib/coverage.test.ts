import { describe, expect, it } from 'vitest'
import { badgePreview, coveredTicks, kitList } from '@/lib/coverage'
import type { ProgressModel, ProgressNode } from '@/lib/progress'

const leaf = (id: string, repeatTimes = 1): ProgressNode => ({
  id,
  repeatTimes,
  requiredOfChildren: 'all',
  children: [],
})
const all = (id: string, children: ProgressNode[]): ProgressNode => ({
  id,
  repeatTimes: 1,
  requiredOfChildren: 'all',
  children,
})

const unit = (mandatory: ProgressNode[], optional: ProgressNode[] = [], q = 0): ProgressModel => ({
  type: 'activity',
  unit: { mandatory, optional, optionsToQualify: q },
})

describe('coveredTicks', () => {
  it('emits a covered leaf id', () => {
    const model = unit([leaf('a'), leaf('b')])
    expect(coveredTicks(model, new Set(['a']))).toEqual(new Set(['a']))
  })

  it('expands a covered repeat leaf to every instance', () => {
    const model = unit([leaf('a', 3)])
    expect(coveredTicks(model, new Set(['a']))).toEqual(new Set(['a#0', 'a#1', 'a#2']))
  })

  it('ignores ids not in the model', () => {
    const model = unit([leaf('a')])
    expect(coveredTicks(model, new Set(['zzz']))).toEqual(new Set())
  })
})

describe('badgePreview', () => {
  it('classifies each leaf as done, covered or missing', () => {
    const model = unit([leaf('a'), leaf('b'), leaf('c')])
    const p = badgePreview(model, new Set(['a']), new Set(['b']))
    expect(p.states).toEqual({ a: 'done', b: 'covered', c: 'missing' })
  })

  it('projects completion from ticks plus the plan', () => {
    const model = unit([leaf('a'), leaf('b')])
    const p = badgePreview(model, new Set(['a']), new Set(['b']))
    expect(p.current.complete).toBe(false)
    expect(p.projected.complete).toBe(true)
  })

  it('counts a covered repeat leaf as fully satisfied', () => {
    const model = unit([leaf('a', 3)])
    const p = badgePreview(model, new Set(), new Set(['a']))
    expect(p.projected.complete).toBe(true)
  })

  it('handles a do-all branch across stages of completion', () => {
    const model = unit([all('p', [leaf('a'), leaf('b')])])
    const p = badgePreview(model, new Set(['a']), new Set(['b']))
    expect(p.states).toEqual({ a: 'done', b: 'covered' })
    expect(p.projected.complete).toBe(true)
  })

  it('leaves manual ticks taking priority over coverage', () => {
    const model = unit([leaf('a')])
    const p = badgePreview(model, new Set(['a']), new Set(['a']))
    expect(p.states.a).toBe('done')
  })
})

describe('kitList', () => {
  it('dedupes case-insensitively keeping first wording', () => {
    expect(
      kitList([{ equipment: ['Gloves', 'Bandages'] }, { equipment: ['gloves', 'Cling film'] }]),
    ).toEqual(['Gloves', 'Bandages', 'Cling film'])
  })

  it('drops blanks', () => {
    expect(kitList([{ equipment: ['  ', 'Mats'] }])).toEqual(['Mats'])
  })
})
