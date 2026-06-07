/** @jsxImportSource preact */
import { useEffect, useMemo, useState } from 'preact/hooks'
import type { BaseSummary, Cover } from '@/lib/bases'
import { getPlan, onPlanChange, togglePlan } from '@/lib/plan'
import { Check, Clock, Plus } from 'lucide-preact'

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
  const [tags, setTags] = useState<string[]>([])
  const [plan, setPlan] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const sync = () => setPlan(getPlan())
    sync()
    setLoaded(true)
    return onPlanChange(sync)
  }, [])

  const tagOptions = useMemo(
    () => [...new Set(bases.flatMap((b) => b.tags))].sort((a, b) => a.localeCompare(b)),
    [bases],
  )

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return bases.filter((b) => {
      if (tags.length && !tags.every((t) => b.tags.includes(t))) return false
      if (!q) return true
      const hay = `${b.title} ${b.description} ${b.tags.join(' ')}`.toLowerCase()
      return hay.includes(q)
    })
  }, [bases, query, tags])

  const planCount = plan.size

  return (
    <div>
      <div class="mb-5 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onInput={(e) => setQuery(e.currentTarget.value)}
          placeholder="Search bases"
          class="min-w-48 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-scout-purple focus:outline-none"
        />
        <a
          href="/plan"
          class="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-scout-purple hover:text-scout-purple"
        >
          Planner
          {loaded && planCount > 0 && (
            <span class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-scout-purple px-1.5 text-xs font-semibold text-white">
              {planCount}
            </span>
          )}
        </a>
      </div>

      {tagOptions.length > 0 && (
        <div class="mb-5 flex flex-wrap gap-2">
          {tagOptions.map((t) => {
            const active = tags.includes(t)
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTags(active ? tags.filter((x) => x !== t) : [...tags, t])}
                class={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  active
                    ? 'border-scout-purple bg-scout-purple text-white'
                    : 'border-slate-300 text-slate-600 hover:border-scout-purple'
                }`}
              >
                {t}
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
          <BaseCard key={b.slug} base={b} on={plan.has(b.slug)} loaded={loaded} />
        ))}
      </ul>
    </div>
  )
}

function BaseCard({ base, on, loaded }: { base: BaseSummary; on: boolean; loaded: boolean }) {
  const badges = coveredBadges(base.covers)
  return (
    <li class="flex flex-col rounded-xl border border-slate-200 bg-white p-4">
      <div class="flex items-start justify-between gap-3">
        <a href={`/bases/${base.slug}`} class="font-semibold text-slate-900 hover:text-scout-purple">
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
        <button
          type="button"
          aria-pressed={on}
          disabled={!loaded}
          onClick={() => togglePlan(base.slug, !on)}
          class={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            on
              ? 'bg-scout-green text-white hover:bg-scout-green/90'
              : 'bg-scout-purple text-white hover:bg-scout-purple/90'
          } ${loaded ? '' : 'opacity-50'}`}
        >
          {on ? <Check size={15} /> : <Plus size={15} />}
          {on ? 'In plan' : 'Add to plan'}
        </button>
      </div>
    </li>
  )
}
