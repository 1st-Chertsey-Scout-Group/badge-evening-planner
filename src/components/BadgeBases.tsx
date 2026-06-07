/** @jsxImportSource preact */
import { useEffect, useState } from 'preact/hooks'
import type { BaseSummary } from '@/lib/bases'
import { getPlan, onPlanChange, togglePlan } from '@/lib/plan'
import { Check, Plus } from 'lucide-preact'

interface Props {
  badgeSlug: string
  bases: BaseSummary[]
}

// Bases that cover this badge, shown on the badge page. Each lists the
// requirements it ticks off here and can be added to the current plan.
export default function BadgeBases({ badgeSlug, bases }: Props) {
  const [plan, setPlan] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const sync = () => setPlan(getPlan())
    sync()
    setLoaded(true)
    return onPlanChange(sync)
  }, [])

  return (
    <ul class="space-y-3">
      {bases.map((b) => {
        const here = b.covers.filter((c) => c.badgeSlug === badgeSlug)
        const on = plan.has(b.slug)
        return (
          <li key={b.slug} class="rounded-xl border border-slate-200 bg-white p-4">
            <div class="flex items-start justify-between gap-3">
              <a
                href={`/bases/${b.slug}`}
                class="font-semibold text-slate-900 hover:text-scout-purple"
              >
                {b.title}
              </a>
              <button
                type="button"
                aria-pressed={on}
                disabled={!loaded}
                onClick={() => togglePlan(b.slug, !on)}
                class={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  on
                    ? 'bg-scout-green text-white hover:bg-scout-green/90'
                    : 'bg-scout-purple text-white hover:bg-scout-purple/90'
                } ${loaded ? '' : 'opacity-50'}`}
              >
                {on ? <Check size={15} /> : <Plus size={15} />}
                {on ? 'In plan' : 'Add to plan'}
              </button>
            </div>
            <ul class="mt-2 space-y-1 text-sm text-slate-600">
              {here.map((c) => (
                <li key={c.reqId} class="flex gap-2">
                  <span class="text-scout-green">+</span>
                  {c.reqTitle}
                </li>
              ))}
            </ul>
          </li>
        )
      })}
    </ul>
  )
}
