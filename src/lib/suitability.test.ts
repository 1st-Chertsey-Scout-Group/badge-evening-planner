import { describe, expect, it } from 'vitest'
import type { Category, ProgressModel, ProgressNode, ProgressUnit } from '@/lib/progress'
import { badgeVerdict, stageVerdicts, unitVerdict } from '@/lib/suitability'

const leaf = (id: string, category: Category): ProgressNode => ({
  id,
  repeatTimes: 1,
  requiredOfChildren: 'all',
  category,
  children: [],
})
const all = (id: string, children: ProgressNode[]): ProgressNode => ({
  id,
  repeatTimes: 1,
  requiredOfChildren: 'all',
  children,
})
const choose = (id: string, n: number, children: ProgressNode[]): ProgressNode => ({
  id,
  repeatTimes: 1,
  requiredOfChildren: n,
  children,
})
const unit = (
  mandatory: ProgressNode[],
  optional: ProgressNode[] = [],
  optionsToQualify = 0,
): ProgressUnit => ({ mandatory, optional, optionsToQualify })

describe('unitVerdict', () => {
  it('is evening when every mandatory leaf is evening', () => {
    expect(unitVerdict(unit([leaf('a', 'evening'), leaf('b', 'evening')]))).toBe('evening')
  })

  it('is over-time when a mandatory leaf needs several sessions', () => {
    expect(unitVerdict(unit([leaf('a', 'evening'), leaf('b', 'over-time')]))).toBe('over-time')
  })

  it('is unsuitable when a mandatory leaf cannot be run', () => {
    expect(unitVerdict(unit([leaf('a', 'evening'), leaf('b', 'unsuitable')]))).toBe('unsuitable')
  })

  it('reads as needs-review (unknown) when blocked only by an unclassified leaf', () => {
    expect(unitVerdict(unit([leaf('a', 'evening'), leaf('b', 'unknown')]))).toBe('unknown')
  })

  it('ranks unknown above unsuitable', () => {
    // an unsuitable mandatory leaf is a harder no than an unclassified one
    expect(unitVerdict(unit([leaf('a', 'unknown'), leaf('b', 'unsuitable')]))).toBe('unsuitable')
  })

  it('qualifies via evening-only options when enough exist', () => {
    // need 2 of 3; two are evening, so the over-time option is not needed
    const u = unit([], [leaf('a', 'evening'), leaf('b', 'evening'), leaf('c', 'over-time')], 2)
    expect(unitVerdict(u)).toBe('evening')
  })

  it('falls to over-time when not enough evening options exist', () => {
    // need 2 of 3 but only one is evening
    const u = unit([], [leaf('a', 'evening'), leaf('b', 'over-time'), leaf('c', 'unsuitable')], 2)
    expect(unitVerdict(u)).toBe('over-time')
  })

  it('handles choose-N branches inside mandatory', () => {
    const u = unit([choose('g', 1, [leaf('a', 'unsuitable'), leaf('b', 'evening')])])
    expect(unitVerdict(u)).toBe('evening')
  })

  it('handles do-all branches inside mandatory', () => {
    const u = unit([all('g', [leaf('a', 'evening'), leaf('b', 'over-time')])])
    expect(unitVerdict(u)).toBe('over-time')
  })
})

describe('badgeVerdict', () => {
  it('uses the single unit for a normal badge', () => {
    const model: ProgressModel = { type: 'activity', unit: unit([leaf('a', 'over-time')]) }
    expect(badgeVerdict(model)).toBe('over-time')
  })

  it('takes the most achievable stage for a staged badge', () => {
    const model: ProgressModel = {
      type: 'staged',
      stages: [unit([leaf('a', 'evening')]), unit([leaf('b', 'over-time')]), unit([leaf('c', 'unsuitable')])],
    }
    expect(badgeVerdict(model)).toBe('evening')
    expect(stageVerdicts(model)).toEqual(['evening', 'over-time', 'unsuitable'])
  })
})
