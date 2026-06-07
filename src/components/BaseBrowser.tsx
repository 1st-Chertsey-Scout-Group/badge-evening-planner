/** @jsxImportSource preact */
import { useMemo, useState } from 'preact/hooks'
import type { BaseSummary, Cover } from '@/lib/bases'
import PlanToggle from './PlanToggle'
import { Clock } from 'lucide-preact'

interface Props {
  bases: BaseSummary[]
}

function coveredBadges(covers: Cover[]): { slug: string; title: string; count: number }[] {
  const m = new Map<string, { slug: string; title: string; count: number }>()
  for (const c of covers) {
    const e = m.get(c.badgeSlug)
    if (e) e.count++
    else m.set(c.badgeSlug, { slug: c.badgeSlug, title: c.badgeTitle, count: 1 })
  }
  return [...m.values()]
}

export default function BaseBrowser({ bases }: Props) {
  const [query, setQuery] = useState('')
  // tag filters held as lower-cased keys so wording variants don't fragment
  const [tags, setTags] = useState<string[]>([])

  // one option per tag, keyed case-insensitively, keeping the first-seen wording
  const tagOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const b of bases)
      for (const t of b.tags) {
        const key = t.toLowerCase()
        if (!seen.has(key)) seen.set(key, t)
      }
    return [...seen.entries()]
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [bases])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return bases.filter((b) => {
      const tagKeys = b.tags.map((t) => t.toLowerCase())
      if (tags.length && !tags.every((t) => tagKeys.includes(t))) return false
      if (!q) return true
      const hay = `${b.title} ${b.description} ${b.tags.join(' ')}`.toLowerCase()
      return hay.includes(q)
    })
  }, [bases, query, tags])

  return (
    <div>
      <div class="mb-5">
        <input
          type="search"
          value={query}
          onInput={(e) => setQuery(e.currentTarget.value)}
          placeholder="Search bases"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-scout-purple focus:outline-none"
        />
      </div>

      {tagOptions.length > 0 && (
        <div class="mb-5 flex flex-wrap gap-2">
          {tagOptions.map(({ key, label }) => {
            const active = tags.includes(key)
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTags(active ? tags.filter((x) => x !== key) : [...tags, key])}
                class={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  active
                    ? 'border-scout-purple bg-scout-purple text-white'
                    : 'border-slate-300 text-slate-600 hover:border-scout-purple'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      <p class="mb-3 text-sm text-slate-500">
        {rows.length} base{rows.length === 1 ? '' : 's'}
      </p>

      <ul class="grid gap-4 sm:grid-cols-2">
        {rows.map((b) => (
          <BaseCard key={b.slug} base={b} />
        ))}
      </ul>
    </div>
  )
}

function BaseCard({ base }: { base: BaseSummary }) {
  const badges = coveredBadges(base.covers)
  return (
    <li class="flex flex-col rounded-xl border border-slate-200 bg-white p-4">
      <div class="flex items-start justify-between gap-3">
        <a
          href={`/bases/${base.slug}`}
          class="font-semibold text-slate-900 hover:text-scout-purple"
        >
          {base.title}
        </a>
        <span class="inline-flex shrink-0 items-center gap-1 text-xs text-slate-500">
          <Clock size={13} /> {base.duration} min
        </span>
      </div>
      {base.description && <p class="mt-1 text-sm text-slate-600">{base.description}</p>}

      {badges.length > 0 && (
        <ul class="mt-3 flex flex-wrap gap-1.5">
          {badges.map((bd) => (
            <li
              key={bd.slug}
              class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
            >
              {bd.title} ({bd.count})
            </li>
          ))}
        </ul>
      )}

      <div class="mt-4 flex items-center justify-end">
        <PlanToggle slug={base.slug} />
      </div>
    </li>
  )
}
