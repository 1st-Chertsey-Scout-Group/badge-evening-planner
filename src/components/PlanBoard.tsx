/** @jsxImportSource preact */
import { useEffect, useMemo, useState } from 'preact/hooks'
import type { BaseSummary, Cover, TouchedBadge } from '@/lib/bases'
import { badgePreview, kitList, type BadgePreview } from '@/lib/coverage'
import {
  clearPlan,
  DEFAULT_LENGTH,
  getPlan,
  getPlanLength,
  onPlanChange,
  removeFromPlan,
  setPlan as writePlan,
  setPlanLength,
} from '@/lib/plan'
import {
  deleteEvening,
  duplicateEvening,
  type Evening,
  listEvenings,
  onEveningsChange,
  saveEvening,
} from '@/lib/evenings'
import { getAllTicked, onProgressChange } from '@/lib/storage'
import { Bookmark, Clock, Copy, FolderOpen, Trash2, X } from 'lucide-preact'

interface Props {
  bases: BaseSummary[]
  badges: TouchedBadge[]
}

const EMPTY: ReadonlySet<string> = new Set()

export default function PlanBoard({ bases, badges }: Props) {
  const [plan, setPlan] = useState<Set<string>>(new Set())
  const [ticks, setTicks] = useState<Record<string, Set<string>>>({})
  const [length, setLength] = useState(DEFAULT_LENGTH)
  const [evenings, setEvenings] = useState<Evening[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const syncPlan = () => {
      setPlan(getPlan())
      setLength(getPlanLength())
    }
    const syncTicks = () => setTicks(getAllTicked())
    const syncEvenings = () => setEvenings(listEvenings())
    syncPlan()
    syncTicks()
    syncEvenings()
    setLoaded(true)
    return combine(
      onPlanChange(syncPlan),
      onProgressChange(syncTicks),
      onEveningsChange(syncEvenings),
    )
  }, [])

  const baseBySlug = useMemo(() => new Map(bases.map((b) => [b.slug, b])), [bases])
  const badgeBySlug = useMemo(() => new Map(badges.map((b) => [b.slug, b])), [badges])

  const selected = useMemo(
    () => [...plan].map((s) => baseBySlug.get(s)).filter((b): b is BaseSummary => Boolean(b)),
    [plan, baseBySlug],
  )

  // covered leaf ids and contributing covers, grouped by badge
  const byBadge = useMemo(() => {
    const m = new Map<string, { ids: Set<string>; covers: Cover[] }>()
    for (const b of selected)
      for (const c of b.covers) {
        let e = m.get(c.badgeSlug)
        if (!e) m.set(c.badgeSlug, (e = { ids: new Set(), covers: [] }))
        if (!e.ids.has(c.reqId)) {
          e.ids.add(c.reqId)
          e.covers.push(c)
        }
      }
    return m
  }, [selected])

  const previews = useMemo(() => {
    const out: { badge: TouchedBadge; covers: Cover[]; p: BadgePreview }[] = []
    for (const [slug, { ids, covers }] of byBadge) {
      const badge = badgeBySlug.get(slug)
      if (!badge) continue
      out.push({ badge, covers, p: badgePreview(badge.model, ticks[slug] ?? EMPTY, ids) })
    }
    return out.sort((a, b) => a.badge.title.localeCompare(b.badge.title))
  }, [byBadge, badgeBySlug, ticks])

  const totalMins = selected.reduce((n, b) => n + b.duration, 0)
  const kit = useMemo(() => kitList(selected), [selected])
  const completes = previews.filter((x) => x.p.projected.complete && !x.p.current.complete).length

  const completing = previews.find((x) => x.p.projected.complete && !x.p.current.complete)
  function save() {
    const name = prompt(
      'Name this evening',
      completing?.badge.title ?? `Evening ${evenings.length + 1}`,
    )
    if (name === null) return
    saveEvening(name, [...plan], length)
  }
  function open(e: Evening) {
    if (plan.size > 0 && !confirm(`Replace the current plan with "${e.name}"?`)) return
    writePlan(e.slugs)
    setPlanLength(e.length)
  }

  const empty = loaded && selected.length === 0

  return (
    <div class="space-y-6">
      {empty ? (
        <div class="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p class="font-medium text-slate-700">Your plan is empty.</p>
          <p class="mt-1 text-sm text-slate-500">
            Add bases to plan an evening{evenings.length > 0 ? ', or open a saved one below' : ''}.
          </p>
          <a
            href="/bases"
            class="mt-4 inline-flex rounded-lg bg-scout-purple px-4 py-2 text-sm font-medium text-white hover:bg-scout-purple/90"
          >
            Browse bases
          </a>
        </div>
      ) : (
        <>
          <div class="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-slate-200 bg-white px-5 py-4">
            <span class="font-semibold text-slate-800">
              {selected.length} base{selected.length === 1 ? '' : 's'}
            </span>
            <span class="inline-flex items-center gap-1.5 text-sm text-slate-600">
              <Clock size={15} /> {totalMins} min of
              <input
                type="number"
                min="1"
                value={length}
                aria-label="Target evening length in minutes"
                onInput={(e) => {
                  const n = Number.parseInt(e.currentTarget.value, 10)
                  if (Number.isFinite(n) && n > 0) setPlanLength(n)
                }}
                class="w-14 rounded border border-slate-300 px-1.5 py-0.5 text-sm focus:border-scout-purple focus:outline-none"
              />
              min
            </span>
            {totalMins > length ? (
              <span class="rounded-full bg-scout-red/10 px-2.5 py-0.5 text-xs font-semibold text-scout-red">
                {totalMins - length} min over
              </span>
            ) : (
              totalMins < length && (
                <span class="text-xs font-medium text-slate-500">
                  {length - totalMins} min spare
                </span>
              )
            )}
            {completes > 0 && (
              <span class="rounded-full bg-scout-green px-2.5 py-0.5 text-xs font-semibold text-white">
                Completes {completes} badge{completes === 1 ? '' : 's'}
              </span>
            )}
            <button
              type="button"
              onClick={() => confirm('Clear the whole plan?') && clearPlan()}
              class="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
              <Trash2 size={14} /> Clear plan
            </button>
          </div>

          <div class="grid gap-6 lg:grid-cols-3">
            <div class="space-y-4 lg:col-span-2">
              <h2 class="text-sm font-semibold tracking-wide text-slate-500 uppercase">
                Badge coverage
              </h2>
              {previews.map(({ badge, covers, p }) => (
                <BadgeCoverage key={badge.slug} badge={badge} covers={covers} p={p} />
              ))}
            </div>

            <div class="space-y-4">
              <SelectedBases bases={selected} />
              <KitList items={kit} />
            </div>
          </div>
        </>
      )}

      {loaded && (selected.length > 0 || evenings.length > 0) && (
        <SavedEvenings
          evenings={evenings}
          canSave={selected.length > 0}
          onSave={save}
          onOpen={open}
        />
      )}
    </div>
  )
}

function SavedEvenings({
  evenings,
  canSave,
  onSave,
  onOpen,
}: {
  evenings: Evening[]
  canSave: boolean
  onSave: () => void
  onOpen: (e: Evening) => void
}) {
  return (
    <section class="rounded-xl border border-slate-200 bg-white p-5">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-sm font-semibold tracking-wide text-slate-500 uppercase">Saved evenings</h2>
        {canSave && (
          <button
            type="button"
            onClick={onSave}
            class="inline-flex items-center gap-1.5 rounded-lg border border-scout-purple px-2.5 py-1 text-xs font-medium text-scout-purple hover:bg-scout-purple hover:text-white"
          >
            <Bookmark size={13} /> Save this plan
          </button>
        )}
      </div>
      {evenings.length === 0 ? (
        <p class="mt-2 text-sm text-slate-500">Save the current plan to reopen it later.</p>
      ) : (
        <ul class="mt-3 divide-y divide-slate-100">
          {evenings.map((e) => (
            <li key={e.id} class="flex items-center gap-2 py-2">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-slate-800">{e.name}</p>
                <p class="text-xs text-slate-500">
                  {e.slugs.length} base{e.slugs.length === 1 ? '' : 's'} &middot; {e.length} min
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpen(e)}
                class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-scout-purple"
              >
                <FolderOpen size={13} /> Open
              </button>
              <button
                type="button"
                aria-label={`Duplicate ${e.name}`}
                onClick={() => duplicateEvening(e.id)}
                class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <Copy size={14} />
              </button>
              <button
                type="button"
                aria-label={`Delete ${e.name}`}
                onClick={() => confirm(`Delete "${e.name}"?`) && deleteEvening(e.id)}
                class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-scout-red"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function BadgeCoverage({
  badge,
  covers,
  p,
}: {
  badge: TouchedBadge
  covers: Cover[]
  p: BadgePreview
}) {
  const newlyComplete = p.projected.complete && !p.current.complete
  const label = badge.model.stages ? 'stages' : 'requirements'
  return (
    <section
      class={`overflow-hidden rounded-xl border bg-white ${
        newlyComplete ? 'border-scout-green/60' : 'border-slate-200'
      }`}
    >
      <div class="flex items-center gap-3 p-4">
        <img
          src={badge.img.src}
          alt={badge.img.alt}
          width={40}
          height={40}
          class="h-10 w-10 shrink-0 rounded-lg bg-white object-contain"
        />
        <div class="min-w-0 flex-1">
          <a
            href={`/badges/${badge.slug}`}
            class="font-semibold text-slate-900 hover:text-scout-purple"
          >
            {badge.title}
          </a>
          <p class="text-xs text-slate-500">
            {p.current.done} of {p.current.needed} {label} done
            {p.projected.done !== p.current.done && (
              <>
                {' '}
                &rarr; <span class="font-semibold text-scout-green">{p.projected.done}</span> with
                this plan
              </>
            )}
          </p>
        </div>
        {newlyComplete && (
          <span class="shrink-0 rounded-full bg-scout-green px-2.5 py-0.5 text-xs font-semibold text-white">
            Completes
          </span>
        )}
      </div>
      <div class="h-1.5 w-full bg-slate-100">
        <div class="h-full bg-scout-purple/30" style={`width:${p.projected.percent}%`}>
          <div
            class="h-full bg-scout-purple"
            style={`width:${pctRatio(p.current.percent, p.projected.percent)}%`}
          />
        </div>
      </div>
      <ul class="space-y-1 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
        {covers.map((c) => (
          <li key={c.reqId} class="flex gap-2">
            <span class="text-scout-green">+</span>
            {c.reqTitle}
          </li>
        ))}
      </ul>
    </section>
  )
}

// inner (already-done) fill as a fraction of the outer (projected) fill width
function pctRatio(now: number, then: number): number {
  return then === 0 ? 0 : Math.round((now / then) * 100)
}

function SelectedBases({ bases }: { bases: BaseSummary[] }) {
  return (
    <section class="rounded-xl border border-slate-200 bg-white p-4">
      <h2 class="text-sm font-semibold tracking-wide text-slate-500 uppercase">This evening</h2>
      <ul class="mt-3 space-y-2">
        {bases.map((b) => (
          <li key={b.slug} class="flex items-center gap-2">
            <a
              href={`/bases/${b.slug}`}
              class="flex-1 text-sm text-slate-700 hover:text-scout-purple"
            >
              {b.title}
            </a>
            <span class="text-xs text-slate-400">{b.duration}m</span>
            <button
              type="button"
              aria-label={`Remove ${b.title}`}
              onClick={() => removeFromPlan(b.slug)}
              class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={15} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function KitList({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <section class="rounded-xl border border-slate-200 bg-white p-4">
      <h2 class="text-sm font-semibold tracking-wide text-slate-500 uppercase">Kit list</h2>
      <ul class="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </section>
  )
}

function combine(...offs: (() => void)[]): () => void {
  return () => offs.forEach((off) => off())
}
