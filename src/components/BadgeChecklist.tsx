/** @jsxImportSource preact */
import { useEffect, useMemo, useState } from 'preact/hooks'
import { badgeTally, nodeTally, unitTally, type Ticked } from '@/lib/progress'
import { getTicked, onProgressChange, resetBadge, setTicked as persist } from '@/lib/storage'
import type { ReqNode, ResolvedBadge, Stage, Unit } from '@/lib/types'
import { Check, ChevronDown, RotateCcw } from 'lucide-preact'
import ProgressRing from './ProgressRing'

interface Props {
  badge: ResolvedBadge
}

interface ToggleProps {
  ticked: Set<string>
  onToggle: (id: string, on: boolean) => void
}

export default function BadgeChecklist({ badge }: Props) {
  const [ticked, setTickedState] = useState<Set<string>>(new Set())
  // saved ticks are read from localStorage after hydration; skeleton until then
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setTickedState(getTicked(badge.slug))
    setLoaded(true)
    return onProgressChange(() => setTickedState(getTicked(badge.slug)))
  }, [badge.slug])

  function setOne(id: string, on: boolean) {
    const next = new Set(ticked)
    if (on) next.add(id)
    else next.delete(id)
    setTickedState(next)
    persist(badge.slug, next)
  }

  function reset() {
    if (confirm('Clear all ticks for this badge?')) {
      resetBadge(badge.slug)
      setTickedState(new Set())
    }
  }

  const tally = useMemo(() => badgeTally(badge, ticked), [badge, ticked])
  const todo = useMemo(() => outstanding(badge, ticked), [badge, ticked])

  return (
    <div>
      <div class="sticky top-0 z-10 -mx-4 mb-6 flex items-center gap-4 border-b border-slate-200 bg-slate-50/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-5">
        {loaded ? (
          <>
            <ProgressRing percent={tally.percent} complete={tally.complete} size={64} stroke={7} />
            <div class="flex-1">
              <p class="text-sm font-semibold text-slate-700">
                {tally.complete ? (
                  <span class="text-scout-green">Badge complete</span>
                ) : (
                  <>
                    {tally.done} of {tally.needed} {badge.stages ? 'stages' : 'requirements'} done
                  </>
                )}
              </p>
              <p class="text-xs text-slate-500">
                {tally.complete
                  ? 'Every requirement is ticked off.'
                  : `${tally.needed - tally.done} to go`}
              </p>
            </div>
            {tally.started && (
              <button
                type="button"
                onClick={reset}
                class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-200 hover:text-slate-700"
              >
                <RotateCcw size={14} /> Reset
              </button>
            )}
          </>
        ) : (
          <>
            <div class="h-16 w-16 shrink-0 animate-pulse rounded-full bg-slate-200" />
            <div class="flex-1 space-y-2">
              <div class="h-4 w-40 animate-pulse rounded bg-slate-200" />
              <div class="h-3 w-24 animate-pulse rounded bg-slate-200" />
            </div>
          </>
        )}
      </div>

      {loaded && todo.length > 0 && (
        <details class="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <summary class="cursor-pointer text-sm font-semibold text-slate-700">
            Still to do ({todo.length})
          </summary>
          <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            {todo.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </details>
      )}

      {badge.stages
        ? badge.stages.map((stage, i) => (
            <StageSection key={i} stage={stage} index={i} ticked={ticked} onToggle={setOne} />
          ))
        : badge.unit && <UnitView unit={badge.unit} ticked={ticked} onToggle={setOne} />}
    </div>
  )
}

const pctOf = (t: { done: number; needed: number }): number =>
  t.needed ? Math.round((t.done / t.needed) * 100) : 100

function unitStarted(unit: Unit, ticked: Ticked): boolean {
  return [...unit.mandatory, ...unit.optional].some((n) => nodeTally(n, ticked).done > 0)
}

function Chevron({ open }: { open: boolean }) {
  return (
    <ChevronDown
      size={16}
      class={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
    />
  )
}

// A staged badge's stage: collapsible, open by default for stage 1 and for any
// stage that already has progress.
function StageSection({
  stage,
  index,
  ticked,
  onToggle,
}: { stage: Stage; index: number } & ToggleProps) {
  const t = unitTally(stage, ticked)
  const done = t.satisfied
  const started = unitStarted(stage, ticked)
  const [override, setOverride] = useState<boolean | null>(null)
  const open = override ?? (index === 0 || started)

  return (
    <section
      class={`mb-4 overflow-hidden rounded-xl border bg-white ${
        done ? 'border-scout-green/50' : 'border-slate-200'
      }`}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOverride(!open)}
        class="flex w-full items-center gap-2 p-4 text-left"
      >
        <span class="shrink-0">
          <ProgressRing
            percent={pctOf(t)}
            complete={done}
            size={28}
            stroke={3}
            label={false}
            center={index + 1}
          />
        </span>
        <h3 class="flex-1 font-semibold text-slate-800">{stage.label}</h3>
        <Chevron open={open} />
      </button>
      {open && (
        <div class="border-t border-slate-100 px-4 pt-3 pb-4">
          <RequirementList
            nodes={[...stage.mandatory, ...stage.optional]}
            ticked={ticked}
            onToggle={onToggle}
          />
        </div>
      )}
    </section>
  )
}

function UnitView({ unit, ticked, onToggle }: { unit: Unit } & ToggleProps) {
  return (
    <div class="space-y-4">
      {unit.requirementsIntroHtml && <Prose html={unit.requirementsIntroHtml} />}
      <RequirementList nodes={unit.mandatory} ticked={ticked} onToggle={onToggle} />

      {unit.optional.length > 0 && (
        <ChooseGroup
          options={unit.optional}
          n={unit.optionsToQualify}
          label={`Choose ${unit.optionsToQualify} of the following`}
          introHtml={unit.optionsIntroHtml}
          ticked={ticked}
          onToggle={onToggle}
        />
      )}
    </div>
  )
}

// "Do all" context: nodes render as checkboxes (or a nested choose-N group).
function RequirementList({ nodes, ticked, onToggle }: { nodes: ReqNode[] } & ToggleProps) {
  return (
    <ul class="space-y-3">
      {nodes.map((node) => (
        <li key={node.id}>
          <Requirement node={node} ticked={ticked} onToggle={onToggle} />
        </li>
      ))}
    </ul>
  )
}

function Requirement({ node, ticked, onToggle }: { node: ReqNode } & ToggleProps) {
  const t = nodeTally(node, ticked)

  // Branch with children: either a do-all group or a choose-N group.
  if (node.children.length > 0) {
    if (typeof node.requiredOfChildren === 'number') {
      return (
        <div>
          <p class="font-medium text-slate-800">{node.title}</p>
          {node.notesHtml && <Prose html={node.notesHtml} />}
          <div class="mt-2">
            <ChooseGroup
              options={node.children}
              n={node.requiredOfChildren}
              ticked={ticked}
              onToggle={onToggle}
            />
          </div>
        </div>
      )
    }
    return (
      <div>
        <div class="flex items-start gap-2">
          <span class="mt-0.5 shrink-0">
            <ProgressRing
              percent={pctOf(t)}
              complete={t.satisfied}
              size={22}
              stroke={3}
              label={false}
            />
          </span>
          <div class="flex-1">
            <p class="flex flex-wrap items-center gap-2 font-medium text-slate-800">
              {node.title}
              <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                Do all
              </span>
            </p>
            {node.notesHtml && <Prose html={node.notesHtml} />}
          </div>
        </div>
        <div class="mt-2 pl-7">
          <RequirementList nodes={node.children} ticked={ticked} onToggle={onToggle} />
        </div>
      </div>
    )
  }

  // Leaf done several times: one checkbox per repeat.
  if (node.repeatTimes > 1) {
    return (
      <div>
        <p class={`font-medium ${t.satisfied ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
          {node.title} <span class="text-xs text-slate-500">({node.repeatTimes} times)</span>
        </p>
        {node.notesHtml && <Prose html={node.notesHtml} />}
        <RepeatBoxes node={node} ticked={ticked} onToggle={onToggle} />
      </div>
    )
  }

  // Plain leaf: a single checkbox.
  return (
    <label class="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        class="mt-1 h-5 w-5 shrink-0 accent-scout-purple"
        checked={ticked.has(node.id)}
        onChange={(e) => onToggle(node.id, e.currentTarget.checked)}
      />
      <span>
        <span class={t.satisfied ? 'text-slate-400 line-through' : 'text-slate-800'}>
          {node.title}
        </span>
        {node.notesHtml && <Prose html={node.notesHtml} />}
      </span>
    </label>
  )
}

function RepeatBoxes({ node, ticked, onToggle }: { node: ReqNode } & ToggleProps) {
  return (
    <div class="mt-1 flex flex-wrap gap-3">
      {Array.from({ length: node.repeatTimes }, (_, k) => {
        const id = `${node.id}#${k}`
        return (
          <label key={k} class="flex cursor-pointer items-center gap-1.5 text-sm text-slate-600">
            <input
              type="checkbox"
              class="h-4 w-4 accent-scout-purple"
              checked={ticked.has(id)}
              onChange={(e) => onToggle(id, e.currentTarget.checked)}
            />
            {k + 1}
          </label>
        )
      })}
    </div>
  )
}

// "Pick N" context: each option is a button (leaf) or expandable card (subtree).
function ChooseGroup({
  options,
  n,
  label,
  introHtml,
  ticked,
  onToggle,
}: { options: ReqNode[]; n: number; label?: string; introHtml?: string } & ToggleProps) {
  const chosen = options.filter((o) => nodeTally(o, ticked).satisfied).length
  const satisfied = chosen >= n
  return (
    <div class="rounded-xl border border-scout-purple/30 bg-scout-purple/5 p-4">
      <p class="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-scout-purple-dark">
        <span>{label ?? `Choose ${n}`}</span>
        <span
          class={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            satisfied ? 'bg-scout-green text-white' : 'bg-white text-slate-500'
          }`}
        >
          {chosen} of {n} done
        </span>
      </p>
      {introHtml && <Prose html={introHtml} />}
      <ul class="space-y-2">
        {options.map((o) => (
          <li key={o.id}>
            <Option option={o} groupSatisfied={satisfied} ticked={ticked} onToggle={onToggle} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function Option({
  option,
  groupSatisfied,
  ticked,
  onToggle,
}: { option: ReqNode; groupSatisfied: boolean } & ToggleProps) {
  const done = nodeTally(option, ticked).satisfied
  const dim = groupSatisfied && !done ? 'opacity-60' : ''

  // Simple leaf option: a single toggle button (selecting it = doing it).
  if (option.children.length === 0 && option.repeatTimes <= 1) {
    return (
      <button
        type="button"
        aria-pressed={done}
        onClick={() => onToggle(option.id, !done)}
        class={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${dim} ${
          done
            ? 'border-scout-purple bg-scout-purple/10'
            : 'border-slate-200 bg-white hover:border-scout-purple/40'
        }`}
      >
        <span
          class={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs text-white ${
            done ? 'border-scout-purple bg-scout-purple' : 'border-slate-300'
          }`}
        >
          {done && <Check size={14} stroke-width={3} />}
        </span>
        <span>
          <span class={`font-medium ${done ? 'text-scout-purple-dark' : 'text-slate-800'}`}>
            {option.title}
          </span>
          {option.notesHtml && <Prose html={option.notesHtml} />}
        </span>
      </button>
    )
  }

  // Subtree option: an expandable card that counts once its sub-steps are done.
  return (
    <ExpandableOption option={option} done={done} dim={dim} ticked={ticked} onToggle={onToggle} />
  )
}

function ExpandableOption({
  option,
  done,
  dim,
  ticked,
  onToggle,
}: { option: ReqNode; done: boolean; dim: string } & ToggleProps) {
  const t = nodeTally(option, ticked)
  const started = t.done > 0
  const [override, setOverride] = useState<boolean | null>(null)
  const open = override ?? started

  const body =
    option.children.length > 0 ? (
      typeof option.requiredOfChildren === 'number' ? (
        <ChooseGroup
          options={option.children}
          n={option.requiredOfChildren}
          ticked={ticked}
          onToggle={onToggle}
        />
      ) : (
        <RequirementList nodes={option.children} ticked={ticked} onToggle={onToggle} />
      )
    ) : (
      <RepeatBoxes node={option} ticked={ticked} onToggle={onToggle} />
    )

  return (
    <div
      class={`overflow-hidden rounded-xl border bg-white ${dim} ${
        done ? 'border-scout-purple' : 'border-slate-200'
      }`}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOverride(!open)}
        class="flex w-full items-center gap-3 p-3 text-left"
      >
        <span class="shrink-0">
          <ProgressRing percent={pctOf(t)} complete={done} size={22} stroke={3} label={false} />
        </span>
        <span class={`flex-1 font-medium ${done ? 'text-scout-purple-dark' : 'text-slate-800'}`}>
          {option.title}
        </span>
        <Chevron open={open} />
      </button>
      {open && (
        <div class="border-t border-slate-100 px-3 pt-2 pb-3">
          {option.notesHtml && <Prose html={option.notesHtml} />}
          <div class="mt-2">{body}</div>
        </div>
      )}
    </div>
  )
}

function Prose({ html }: { html: string }) {
  return (
    <div
      class="prose-notes mt-1 text-sm text-slate-500 [&_a]:text-scout-purple [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

// Titles of what still needs doing: outstanding mandatory leaves, plus a hint
// line for each unsatisfied choose-N branch and optional pool.
function outstanding(badge: ResolvedBadge, ticked: Ticked): string[] {
  const out: string[] = []
  const units = badge.stages ?? (badge.unit ? [badge.unit] : [])
  for (const u of units) {
    u.mandatory.forEach((n) => collect(n, ticked, out))
    const chosen = u.optional.filter((o) => nodeTally(o, ticked).satisfied).length
    const remaining = u.optionsToQualify - chosen
    if (remaining > 0)
      out.push(`Choose ${remaining} more optional requirement${remaining > 1 ? 's' : ''}`)
  }
  return out
}

function collect(node: ReqNode, ticked: Ticked, out: string[]) {
  if (nodeTally(node, ticked).satisfied) return
  if (node.children.length === 0) {
    out.push(node.title)
    return
  }
  if (node.requiredOfChildren === 'all') {
    node.children.forEach((c) => collect(c, ticked, out))
  } else {
    const chosen = node.children.filter((c) => nodeTally(c, ticked).satisfied).length
    out.push(`Choose ${node.requiredOfChildren - chosen} of: ${node.title}`)
  }
}
