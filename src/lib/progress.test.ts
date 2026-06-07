import { describe, expect, it } from 'vitest'
import { badgeTally, nodeTally, unitTally, type ProgressModel, type ProgressNode } from './progress'

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
const choose = (id: string, n: number, children: ProgressNode[]): ProgressNode => ({
  id,
  repeatTimes: 1,
  requiredOfChildren: n,
  children,
})

describe('nodeTally', () => {
  it('counts a plain leaf', () => {
    expect(nodeTally(leaf('a'), new Set())).toEqual({ done: 0, needed: 1, satisfied: false })
    expect(nodeTally(leaf('a'), new Set(['a']))).toEqual({ done: 1, needed: 1, satisfied: true })
  })

  it('counts a repeat leaf per instance', () => {
    const n = leaf('a', 3)
    expect(nodeTally(n, new Set(['a#0', 'a#1']))).toEqual({ done: 2, needed: 3, satisfied: false })
    expect(nodeTally(n, new Set(['a#0', 'a#1', 'a#2']))).toEqual({
      done: 3,
      needed: 3,
      satisfied: true,
    })
  })

  it('sums a do-all branch', () => {
    const n = all('p', [leaf('a'), leaf('b')])
    expect(nodeTally(n, new Set(['a']))).toEqual({ done: 1, needed: 2, satisfied: false })
    expect(nodeTally(n, new Set(['a', 'b']))).toEqual({ done: 2, needed: 2, satisfied: true })
  })

  it('caps a choose-N branch at N', () => {
    const n = choose('p', 1, [leaf('a'), leaf('b'), leaf('c')])
    expect(nodeTally(n, new Set())).toEqual({ done: 0, needed: 1, satisfied: false })
    expect(nodeTally(n, new Set(['a'])).satisfied).toBe(true)
    // doing more than required still only counts N
    expect(nodeTally(n, new Set(['a', 'b']))).toEqual({ done: 1, needed: 1, satisfied: true })
  })
})

describe('unitTally', () => {
  it('requires mandatory plus optionsToQualify of the optional pool', () => {
    const unit = {
      mandatory: [leaf('m')],
      optional: [leaf('o1'), leaf('o2'), leaf('o3')],
      optionsToQualify: 1,
    }
    expect(unitTally(unit, new Set())).toEqual({ done: 0, needed: 2, satisfied: false })
    expect(unitTally(unit, new Set(['m'])).satisfied).toBe(false)
    expect(unitTally(unit, new Set(['m', 'o2']))).toEqual({ done: 2, needed: 2, satisfied: true })
    // extra optional choices are capped
    expect(unitTally(unit, new Set(['m', 'o1', 'o2', 'o3'])).done).toBe(2)
  })
})

describe('badgeTally', () => {
  it('reports percent/complete/started for a normal badge', () => {
    const model: ProgressModel = {
      type: 'activity',
      unit: { mandatory: [leaf('a'), leaf('b')], optional: [], optionsToQualify: 0 },
    }
    expect(badgeTally(model, new Set())).toMatchObject({ percent: 0, complete: false, started: false })
    expect(badgeTally(model, new Set(['a']))).toMatchObject({ percent: 50, started: true, complete: false })
    expect(badgeTally(model, new Set(['a', 'b']))).toMatchObject({ percent: 100, complete: true })
  })

  it('counts stages for a staged badge', () => {
    const stage = (id: string) => ({ mandatory: [leaf(id)], optional: [], optionsToQualify: 0 })
    const model: ProgressModel = {
      type: 'staged',
      stages: [stage('s1'), stage('s2'), stage('s3'), stage('s4')],
    }
    expect(badgeTally(model, new Set())).toMatchObject({ done: 0, needed: 4, percent: 0 })
    expect(badgeTally(model, new Set(['s1', 's2']))).toMatchObject({ done: 2, percent: 50, started: true })
    expect(badgeTally(model, new Set(['s1', 's2', 's3', 's4']))).toMatchObject({
      complete: true,
      percent: 100,
    })
  })
})
