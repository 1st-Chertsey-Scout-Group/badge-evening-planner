import { marked } from 'marked'

// Render the harvester's markdown (already ASCII-folded) to HTML. Sync mode.
export function md(src: string | null | undefined): string {
  if (!src) return ''
  return marked.parse(src, { async: false })
}
