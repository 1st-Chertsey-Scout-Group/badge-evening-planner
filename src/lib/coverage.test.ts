import { describe, expect, it } from 'vitest'
import { badgeCoverage, coveredLeavesForBadge, coveredTicks, kitList } from '@/lib/coverage'
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

describe('badgeCoverage', () => {
  it('classifies each leaf as covered or missing', () => {
    const model = unit([leaf('a'), leaf('b'), leaf('c')])
    const c = badgeCoverage(model, new Set(['a', 'b']))
    expect(c.states).toEqual({ a: 'covered', b: 'covered', c: 'missing' })
  })

  it('completes a badge once the plan covers everything', () => {
    const model = unit([leaf('a'), leaf('b')])
    expect(badgeCoverage(model, new Set(['a'])).tally.complete).toBe(false)
    expect(badgeCoverage(model, new Set(['a', 'b'])).tally.complete).toBe(true)
  })

  it('counts a covered repeat leaf as fully satisfied', () => {
    const model = unit([leaf('a', 3)])
    expect(badgeCoverage(model, new Set(['a'])).tally.complete).toBe(true)
  })

  it('handles a do-all branch', () => {
    const model = unit([all('p', [leaf('a'), leaf('b')])])
    const c = badgeCoverage(model, new Set(['a', 'b']))
    expect(c.states).toEqual({ a: 'covered', b: 'covered' })
    expect(c.tally.complete).toBe(true)
  })
})

describe('coveredLeavesForBadge', () => {
  const bases = [
    { slug: 'bleeding', covers: [{ reqId: '1', badgeSlug: 'first-aid' }] },
    {
      slug: 'burns',
      covers: [
        { reqId: '2', badgeSlug: 'first-aid' },
        { reqId: '9', badgeSlug: 'fire-safety' },
      ],
    },
  ]

  it('unions leaf ids from in-plan bases for the badge', () => {
    expect(coveredLeavesForBadge('first-aid', new Set(['bleeding', 'burns']), bases)).toEqual(
      new Set(['1', '2']),
    )
  })

  it('ignores bases not in the plan and covers for other badges', () => {
    expect(coveredLeavesForBadge('first-aid', new Set(['burns']), bases)).toEqual(new Set(['2']))
    expect(coveredLeavesForBadge('fire-safety', new Set(['burns']), bases)).toEqual(new Set(['9']))
  })
})

describe('kitList', () => {
  it('dedupes case-insensitively keeping first wording, with counts', () => {
    expect(
      kitList([{ equipment: ['Gloves', 'Bandages'] }, { equipment: ['gloves', 'Cling film'] }]),
    ).toEqual([
      { item: 'Gloves', count: 2 },
      { item: 'Bandages', count: 1 },
      { item: 'Cling film', count: 1 },
    ])
  })

  it('drops blanks', () => {
    expect(kitList([{ equipment: ['  ', 'Mats'] }])).toEqual([{ item: 'Mats', count: 1 }])
  })
})
