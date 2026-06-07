/** @jsxImportSource preact */
import { useEffect, useState } from 'preact/hooks'
import { inPlan, onPlanChange, togglePlan } from '@/lib/plan'
import { Check, Plus } from 'lucide-preact'

interface Props {
  slug: string
  size?: 'sm' | 'md'
}

// Add/remove a single base from the current plan. Used where there isn't a
// whole-grid island already tracking plan state (base detail, badge page).
export default function PlanToggle({ slug, size = 'md' }: Props) {
  const [on, setOn] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const sync = () => setOn(inPlan(slug))
    sync()
    setLoaded(true)
    return onPlanChange(sync)
  }, [slug])

  const pad = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-sm'
  const icon = size === 'sm' ? 14 : 16

  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={!loaded}
      onClick={() => togglePlan(slug, !on)}
      class={`inline-flex items-center gap-1.5 rounded-lg font-medium transition ${pad} ${
        on
          ? 'bg-scout-green text-white hover:bg-scout-green/90'
          : 'bg-scout-purple text-white hover:bg-scout-purple/90'
      } ${loaded ? '' : 'opacity-50'}`}
    >
      {on ? <Check size={icon} /> : <Plus size={icon} />}
      {on ? 'In plan' : 'Add to plan'}
    </button>
  )
}
