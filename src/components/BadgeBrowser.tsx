/** @jsxImportSource preact */
import { useEffect, useMemo, useState } from 'preact/hooks'
import { type BadgeType, type ProgressModel } from '@/lib/progress'
import { badgeCoverage, coveredLeavesForBadge } from '@/lib/coverage'
import { getPlan, onPlanChange } from '@/lib/plan'
import { TYPE_LABEL, TYPE_ORDER } from '@/lib/badges'

export interface BadgeSummary {
  slug: string
  title: string
  type: BadgeType
  img: { src: string; alt: string }
  model: ProgressModel
}

export interface PlanBase {
  slug: string
  covers: { reqId: string; badgeSlug: string }[]
}

type Status = 'all' | 'uncovered' | 'partial' | 'complete'

const STATUS_LABEL: Record<Exclude<Status, 'all'>, string> = {
  uncovered: 'Not covered',
  partial: 'Partly covered',
  complete: 'Completed',
}

interface Props {
  badges: BadgeSummary[]
  bases: PlanBase[]
}

export default function BadgeBrowser({ badges, bases }: Props) {
  const [plan, setPlan] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [types, setTypes] = useState<BadgeType[]>([])
  const [status, setStatus] = useState<Status>('all')
  // the plan lives in localStorage, read after hydration; skeleton until then
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const sync = () => setPlan(getPlan())
    sync()
    setLoaded(true)
    return onPlanChange(sync)
  }, [])

  const typeOptions = useMemo(
    () => TYPE_ORDER.filter((t) => badges.some((b) => b.type === t)),
    [badges],
  )

  const rows = useMemo(
    () =>
      badges.map((b) => {
        const covered = coveredLeavesForBadge(b.slug, plan, bases)
        const tally = badgeCoverage(b.model, covered).tally
        const s: Exclude<Status, 'all'> = tally.complete
          ? 'complete'
          : tally.started
            ? 'partial'
            : 'uncovered'
        return { badge: b, tally, status: s }
      }),
    [badges, bases, plan],
  )

  const q = query.trim().toLowerCase()
  const shown = rows.filter(
    (r) =>
      (q === '' || r.badge.title.toLowerCase().includes(q)) &&
      (types.length === 0 || types.includes(r.badge.type)) &&
      (status === 'all' || r.status === status),
  )

  const completeCount = rows.filter((r) => r.status === 'complete').length
  const partialCount = rows.filter((r) => r.status === 'partial').length

  function toggleType(t: BadgeType) {
    setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))
  }

  return (
    <div>
      <div class="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
        {loaded ? (
          <p class="text-sm text-slate-600">
            Your plan completes <span class="font-semibold text-scout-green">{completeCount}</span>{' '}
            and partly covers <span class="font-semibold text-scout-purple">{partialCount}</span>
            <span class="text-slate-400"> of {badges.length} badges</span>
          </p>
        ) : (
          <div class="h-4 w-48 animate-pulse rounded bg-slate-200" />
        )}
        <a
          href="/plan"
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          Open planner
        </a>
      </div>

      <div class="mb-6 space-y-3">
        <input
          type="search"
          value={query}
          onInput={(e) => setQuery(e.currentTarget.value)}
          placeholder="Search badges..."
          class="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-scout-purple focus:ring-2 focus:ring-scout-purple/30 focus:outline-none"
        />
        <div class="flex flex-wrap gap-2">
          <Chip active={types.length === 0} onClick={() => setTypes([])}>
            All types
          </Chip>
          {typeOptions.map((t) => (
            <Chip key={t} active={types.includes(t)} onClick={() => toggleType(t)}>
              {TYPE_LABEL[t]}
            </Chip>
          ))}
        </div>
        <div class="flex flex-wrap gap-2">
          {(['all', 'uncovered', 'partial', 'complete'] as Status[]).map((s) => (
            <Chip key={s} active={status === s} onClick={() => setStatus(s)} subtle>
              {s === 'all' ? 'Any coverage' : STATUS_LABEL[s]}
            </Chip>
          ))}
        </div>
      </div>

      <p class="mb-4 text-sm text-slate-500">
        {shown.length} badge{shown.length === 1 ? '' : 's'}
      </p>

      {shown.length === 0 ? (
        <p class="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          No badges match.
        </p>
      ) : (
        <ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((r) => (
            <li key={r.badge.slug}>
              <a
                href={`/badges/${r.badge.slug}`}
                class="flex h-full flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 text-center transition hover:border-scout-purple/50 hover:shadow-md"
              >
                <img
                  src={r.badge.img.src}
                  alt={r.badge.img.alt}
                  width={96}
                  height={96}
                  loading="lazy"
                  class="h-20 w-20 object-contain"
                />
                <span class="mt-3 line-clamp-2 text-sm font-semibold text-slate-800">
                  {r.badge.title}
                </span>
                <span class="mt-1 text-xs text-slate-400">{TYPE_LABEL[r.badge.type]}</span>
                {!loaded ? (
                  <div class="mt-auto w-full pt-3">
                    <div class="h-1.5 w-full animate-pulse rounded-full bg-slate-200" />
                    <div class="mt-1 h-3 w-10 animate-pulse rounded bg-slate-200" />
                  </div>
                ) : r.status === 'uncovered' ? (
                  <p class="mt-auto pt-3 text-xs text-slate-400">Not in plan</p>
                ) : (
                  <div class="mt-auto w-full pt-3">
                    <div
                      class="h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={r.tally.percent}
                      aria-label={`${r.badge.title}: plan covers ${r.tally.percent}%`}
                    >
                      <div
                        class={`h-full rounded-full transition-all ${
                          r.tally.complete ? 'bg-scout-green' : 'bg-scout-purple'
                        }`}
                        style={{ width: `${r.tally.percent}%` }}
                      />
                    </div>
                    <p
                      class={`mt-1 text-xs font-medium ${
                        r.tally.complete ? 'text-scout-green' : 'text-slate-500'
                      }`}
                    >
                      {r.tally.complete ? 'Completed' : `${r.tally.percent}%`}
                    </p>
                  </div>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface ChipProps {
  active: boolean
  subtle?: boolean
  onClick: () => void
  children: preact.ComponentChildren
}

function Chip({ active, subtle, onClick, children }: ChipProps) {
  const base = 'rounded-full px-3 py-1.5 text-sm font-medium transition'
  const on = subtle ? 'bg-slate-800 text-white' : 'bg-scout-purple text-white'
  const off = 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
  return (
    <button type="button" onClick={onClick} class={`${base} ${active ? on : off}`}>
      {children}
    </button>
  )
}
