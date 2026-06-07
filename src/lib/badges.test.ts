import { describe, expect, it } from 'vitest'
import { TYPE_LABEL, TYPE_ORDER } from '@/lib/badges'

describe('badge types', () => {
  it('labels and orders every type', () => {
    expect(TYPE_ORDER).toEqual(['activity', 'challenge', 'staged', 'top'])
    for (const t of TYPE_ORDER) expect(TYPE_LABEL[t]).toBeTruthy()
  })
})
