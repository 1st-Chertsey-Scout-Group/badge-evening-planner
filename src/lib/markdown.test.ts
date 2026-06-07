import { describe, expect, it } from 'vitest'
import { md } from '@/lib/markdown'

describe('md', () => {
  it('returns empty for falsy input', () => {
    expect(md('')).toBe('')
    expect(md(null)).toBe('')
    expect(md(undefined)).toBe('')
  })

  it('renders bold', () => {
    expect(md('**bold**')).toContain('<strong>bold</strong>')
  })

  it('renders a bullet list', () => {
    const html = md('- a\n- b')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>a</li>')
  })

  it('renders a gfm table', () => {
    const html = md('| A | B |\n| --- | --- |\n| 1 | 2 |')
    expect(html).toContain('<table>')
    expect(html).toContain('<th>A</th>')
  })
})
