/** @jsxImportSource preact */
import { useEffect, useMemo, useState } from 'preact/hooks'
import { badgeTally, type BadgeType, type ProgressModel } from '@/lib/progress'
import {
  exportProgress,
  getAllTicked,
  importProgress,
  onProgressChange,
  resetAll,
} from '@/lib/storage'
import { TYPE_LABEL, TYPE_ORDER } from '@/lib/badges'
import { Download, Trash2, Upload } from 'lucide-preact'
import ProgressRing from './ProgressRing'

export interface BadgeSummary {
  slug: string
  title: string
  type: BadgeType
  img: { src: string; alt: string }
  model: ProgressModel
}

type Status = 'all' | 'not-started' | 'in-progress' | 'complete'

const STATUS_LABEL: Record<Exclude<Status, 'all'>, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  complete: 'Complete',
}

const EMPTY: ReadonlySet<string> = new Set()

interface Props {
  badges: BadgeSummary[]
}

export default function BadgeBrowser({ badges }: Props) {
  const [ticked, setTicked] = useState<Record<string, Set<string>>>({})
  const [query, setQuery] = useState('')
  const [types, setTypes] = useState<BadgeType[]>([])
  const [status, setStatus] = useState<Status>('all')

  useEffect(() => {
    const sync = () => setTicked(getAllTicked())
    sync()
    return onProgressChange(sync)
  }, [])

  const typeOptions = useMemo(
    () => TYPE_ORDER.filter((t) => badges.some((b) => b.type === t)),
    [badges],
  )

  const rows = useMemo(
    () =>
      badges.map((b) => {
        const tally = badgeTally(b.model, ticked[b.slug] ?? EMPTY)
        const s: Exclude<Status, 'all'> = tally.complete
          ? 'complete'
          : tally.started
            ? 'in-progress'
            : 'not-started'
        return { badge: b, tally, status: s }
      }),
    [badges, ticked],
  )

  const q = query.trim().toLowerCase()
  const shown = rows.filter(
    (r) =>
      (q === '' || r.badge.title.toLowerCase().includes(q)) &&
      (types.length === 0 || types.includes(r.badge.type)) &&
      (status === 'all' || r.status === status),
  )

  const completeCount = rows.filter((r) => r.status === 'complete').length
  const startedCount = rows.filter((r) => r.status === 'in-progress').length

  function download() {
    const blob = new Blob([exportProgress()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'badge-progress.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function onImportFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    file
      .text()
      .then((text) => {
        importProgress(text)
        setTicked(getAllTicked())
      })
      .catch(() => alert('Could not read that progress file.'))
  }

  function resetEverything() {
    if (confirm('Clear saved progress for every badge? This cannot be undone.')) {
      resetAll()
      setTicked({})
    }
  }

  function toggleType(t: BadgeType) {
    setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))
  }

  return (
    <div>
      <div class="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
        <p class="text-sm text-slate-600">
          <span class="font-semibold text-scout-green">{completeCount}</span> complete,{' '}
          <span class="font-semibold text-scout-purple">{startedCount}</span> in progress
          <span class="text-slate-400"> of {badges.length}</span>
        </p>
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            onClick={download}
            class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            <Download size={15} /> Export
          </button>
          <label class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">
            <Upload size={15} /> Import
            <input
              type="file"
              accept="application/json,.json"
              class="hidden"
              onChange={onImportFile}
            />
          </label>
          <button
            type="button"
            onClick={resetEverything}
            class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-scout-red ring-1 ring-scout-red/30 hover:bg-scout-red/5"
          >
            <Trash2 size={15} /> Reset all
          </button>
        </div>
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
          {(['all', 'not-started', 'in-progress', 'complete'] as Status[]).map((s) => (
            <Chip key={s} active={status === s} onClick={() => setStatus(s)} subtle>
              {s === 'all' ? 'Any progress' : STATUS_LABEL[s]}
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
                <span class="relative">
                  <img
                    src={r.badge.img.src}
                    alt={r.badge.img.alt}
                    width={96}
                    height={96}
                    loading="lazy"
                    class="h-20 w-20 object-contain"
                  />
                  {r.status !== 'not-started' && (
                    <span class="absolute -right-1 -bottom-1">
                      <ProgressRing
                        percent={r.tally.percent}
                        complete={r.tally.complete}
                        size={30}
                        stroke={4}
                      />
                    </span>
                  )}
                </span>
                <span class="mt-3 line-clamp-2 text-sm font-semibold text-slate-800">
                  {r.badge.title}
                </span>
                <span class="mt-1 text-xs text-slate-400">{TYPE_LABEL[r.badge.type]}</span>
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
