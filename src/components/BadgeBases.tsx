/** @jsxImportSource preact */
import type { BaseSummary } from '@/lib/bases'
import PlanToggle from './PlanToggle'

interface Props {
  badgeSlug: string
  bases: BaseSummary[]
}

// Bases that cover this badge, shown on the badge page. Each lists the
// requirements it covers here and can be added to the current plan.
export default function BadgeBases({ badgeSlug, bases }: Props) {
  return (
    <ul class="space-y-3">
      {bases.map((b) => {
        const here = b.covers.filter((c) => c.badgeSlug === badgeSlug)
        return (
          <li key={b.slug} class="rounded-xl border border-slate-200 bg-white p-4">
            <div class="flex items-start justify-between gap-3">
              <a
                href={`/bases/${b.slug}`}
                class="font-semibold text-slate-900 hover:text-scout-purple"
              >
                {b.title}
              </a>
              <PlanToggle slug={b.slug} />
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
