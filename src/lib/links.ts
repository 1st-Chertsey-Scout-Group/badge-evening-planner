// Rewrite links in rendered note/tip HTML. Links to a badge we host point at our
// own page; any other scouts.org.uk path is absolutised and opened in a new tab.

const BADGE_PATH =
  /^\/(?:scouts\/(?:activity-badges|awards)|staged-badges|top-awards)\/([a-z0-9-]+)\/?$/

// If a URL points at a badge we host, return our internal path for it, else null.
export function badgeHrefFor(url: string, badgeSlugs: ReadonlySet<string>): string | null {
  const path = url.replace(/^https?:\/\/[^/]+/, '')
  const m = path.match(BADGE_PATH)
  return m && badgeSlugs.has(m[1]) ? `/badges/${m[1]}` : null
}

export function rewriteLinks(html: string, badgeSlugs: ReadonlySet<string>): string {
  return html.replace(/<a href="([^"]*)"([^>]*)>/g, (whole, href: string, rest: string) => {
    const badge = href.match(BADGE_PATH)
    if (badge && badgeSlugs.has(badge[1])) {
      return `<a href="/badges/${badge[1]}"${rest}>`
    }
    if (href.startsWith('/')) {
      return `<a href="https://www.scouts.org.uk${href}" target="_blank" rel="noopener"${rest}>`
    }
    if (/^https?:\/\//i.test(href)) {
      return `<a href="${href}" target="_blank" rel="noopener"${rest}>`
    }
    return whole
  })
}
