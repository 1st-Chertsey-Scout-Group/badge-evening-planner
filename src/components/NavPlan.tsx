/** @jsxImportSource preact */
import { useEffect, useState } from 'preact/hooks'
import { getPlan, onPlanChange } from '@/lib/plan'

// Planner nav link with a live count of bases in the current plan.
export default function NavPlan() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const sync = () => setCount(getPlan().size)
    sync()
    return onPlanChange(sync)
  }, [])

  return (
    <a
      href="/plan"
      class="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-scout-purple"
    >
      Planner
      {count > 0 && (
        <span class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-scout-purple px-1.5 text-xs font-semibold text-white">
          {count}
        </span>
      )}
    </a>
  )
}
