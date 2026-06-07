import { describe, expect, it } from 'vitest'
import { badgeHrefFor, rewriteLinks } from '@/lib/links'

const slugs = new Set(['chef', 'hill-walker'])

describe('rewriteLinks', () => {
  it('points hosted badge links at our own page', () => {
    expect(rewriteLinks('<a href="/scouts/activity-badges/chef/">Chef</a>', slugs)).toBe(
      '<a href="/badges/chef">Chef</a>',
    )
  })

  it('absolutises other scouts paths and opens them in a new tab', () => {
    expect(rewriteLinks('<a href="/volunteers/safety/">Safety</a>', slugs)).toBe(
      '<a href="https://www.scouts.org.uk/volunteers/safety/" target="_blank" rel="noopener">Safety</a>',
    )
  })

  it('opens absolute external links in a new tab', () => {
    expect(rewriteLinks('<a href="https://example.com/x">x</a>', slugs)).toBe(
      '<a href="https://example.com/x" target="_blank" rel="noopener">x</a>',
    )
  })

  it('keeps a badge-shaped link external when we do not host that slug', () => {
    expect(rewriteLinks('<a href="/scouts/activity-badges/unknown/">x</a>', slugs)).toBe(
      '<a href="https://www.scouts.org.uk/scouts/activity-badges/unknown/" target="_blank" rel="noopener">x</a>',
    )
  })

  it('leaves non-anchor html untouched', () => {
    expect(rewriteLinks('<p>no links here</p>', slugs)).toBe('<p>no links here</p>')
  })
})

describe('badgeHrefFor', () => {
  it('maps a hosted scouts badge url to our page', () => {
    expect(
      badgeHrefFor('https://www.scouts.org.uk/scouts/activity-badges/hill-walker/', slugs),
    ).toBe('/badges/hill-walker')
  })

  it('returns null for another section variant', () => {
    expect(
      badgeHrefFor('https://www.scouts.org.uk/explorers/activity-badges/hill-walker/', slugs),
    ).toBeNull()
  })

  it('returns null for a non-badge path', () => {
    expect(badgeHrefFor('https://www.scouts.org.uk/volunteers/safety/', slugs)).toBeNull()
  })
})
