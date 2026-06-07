/** @jsxImportSource preact */
import { useEffect, useMemo, useState } from 'preact/hooks'
import { badgeTally, nodeTally, type Ticked } from '@/lib/progress'
import { getTicked, onProgressChange, resetBadge, setTicked as persist } from '@/lib/storage'
import type { ReqNode, ResolvedBadge, Unit } from '@/lib/types'
import ProgressRing from './ProgressRing'

interface Props {
  badge: ResolvedBadge
}

export default function BadgeChecklist({ badge }: Props) {
  const [ticked, setTickedState] = useState<Set<string>>(new Set())

  useEffect(() => {
    setTickedState(getTicked(badge.slug))
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
            class="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-200 hover:text-slate-700"
          >
            Reset
          </button>
        )}
      </div>

      {todo.length > 0 && (
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
        ? badge.stages.map((stage, i) => {
            const done = nodeTallyUnit(stage, ticked)
            return (
              <section key={i} class="mb-4 rounded-xl border border-slate-200 bg-white p-4">
                <header class="mb-2 flex items-center gap-2">
                  <span
                    class={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      done ? 'bg-scout-green text-white' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {done ? '✓' : i + 1}
                  </span>
                  <h3 class="font-semibold text-slate-800">{stage.label}</h3>
                </header>
                <NodeList
                  nodes={[...stage.mandatory, ...stage.optional]}
                  ticked={ticked}
                  onToggle={setOne}
                />
              </section>
            )
          })
        : badge.unit && <UnitView unit={badge.unit} ticked={ticked} onToggle={setOne} />}
    </div>
  )
}

function nodeTallyUnit(unit: Unit, ticked: Ticked): boolean {
  return (
    unit.mandatory.every((n) => nodeTally(n, ticked).satisfied) &&
    unit.optional.every((n) => nodeTally(n, ticked).satisfied)
  )
}

interface UnitProps {
  unit: Unit
  ticked: Set<string>
  onToggle: (id: string, on: boolean) => void
}

function UnitView({ unit, ticked, onToggle }: UnitProps) {
  const chosen = unit.optional.filter((o) => nodeTally(o, ticked).satisfied).length
  return (
    <div class="space-y-4">
      {unit.requirementsIntroHtml && <Prose html={unit.requirementsIntroHtml} />}
      <NodeList nodes={unit.mandatory} ticked={ticked} onToggle={onToggle} />

      {unit.optional.length > 0 && (
        <div class="rounded-xl border border-scout-purple/30 bg-scout-purple/5 p-4">
          <p class="mb-1 text-sm font-semibold text-scout-purple-dark">
            Choose {unit.optionsToQualify} of the following
            <span class="ml-2 font-normal text-slate-500">
              ({chosen}/{unit.optionsToQualify} chosen)
            </span>
          </p>
          {unit.optionsIntroHtml && <Prose html={unit.optionsIntroHtml} />}
          <div class="mt-2">
            <NodeList nodes={unit.optional} ticked={ticked} onToggle={onToggle} />
          </div>
        </div>
      )}
    </div>
  )
}

interface NodeListProps {
  nodes: ReqNode[]
  ticked: Set<string>
  onToggle: (id: string, on: boolean) => void
}

function NodeList({ nodes, ticked, onToggle }: NodeListProps) {
  return (
    <ul class="space-y-3">
      {nodes.map((node) => (
        <li key={node.id}>
          <Node node={node} ticked={ticked} onToggle={onToggle} />
        </li>
      ))}
    </ul>
  )
}

function Node({ node, ticked, onToggle }: { node: ReqNode } & Omit<NodeListProps, 'nodes'>) {
  const t = nodeTally(node, ticked)

  // Branch node: a group with a do-all / choose-N rule and nested children.
  if (node.children.length > 0) {
    return (
      <div
        class={`rounded-lg border-l-4 pl-3 ${t.satisfied ? 'border-scout-green' : 'border-slate-200'}`}
      >
        <p class="flex flex-wrap items-center gap-2 font-medium text-slate-800">
          {node.title}
          <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
            {node.requiredOfChildren === 'all' ? 'Do all' : `Choose ${node.requiredOfChildren}`}
          </span>
        </p>
        {node.notesHtml && <Prose html={node.notesHtml} />}
        <div class="mt-2">
          <NodeList nodes={node.children} ticked={ticked} onToggle={onToggle} />
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
        <div class="mt-1 flex flex-wrap gap-3">
          {Array.from({ length: node.repeatTimes }, (_, k) => {
            const id = `${node.id}#${k}`
            return (
              <label
                key={k}
                class="flex cursor-pointer items-center gap-1.5 text-sm text-slate-600"
              >
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
