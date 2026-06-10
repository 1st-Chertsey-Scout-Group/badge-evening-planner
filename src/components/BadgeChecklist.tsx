/** @jsxImportSource preact */
import { useEffect, useMemo, useState } from 'preact/hooks'
import { nodeTally, unitTally, type Category, type Ticked } from '@/lib/progress'
import { badgeCoverage, coveredLeavesForBadge, coveredTicks } from '@/lib/coverage'
import { getPlan, onPlanChange } from '@/lib/plan'
import { SUIT_META } from '@/lib/suitability'
import type { BaseSummary } from '@/lib/bases'
import type { ReqNode, ResolvedBadge, Stage, Unit } from '@/lib/types'
import { Check } from 'lucide-preact'
import { PROSE } from '@/lib/prose'
import ProgressRing from './ProgressRing'

interface Props {
  badge: ResolvedBadge
  // bases that cover this badge (each lists the leaf requirements it covers)
  bases: BaseSummary[]
  // one verdict per stage (staged badges only), computed at build
  stageVerdicts?: Category[]
}

interface View {
  ticked: Ticked
  // leaf id -> titles of the in-plan bases that cover it
  coveredBy: Map<string, string[]>
}

const EMPTY: View = { ticked: new Set(), coveredBy: new Map() }

// Read-only checklist: a requirement is ticked when a base in the current plan
// covers it. There is no manual progress - the plan is the only source of done.
export default function BadgeChecklist({ badge, bases, stageVerdicts }: Props) {
  const [view, setView] = useState<View>(EMPTY)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const sync = () => {
      const plan = getPlan()
      const coveredBy = new Map<string, string[]>()
      for (const b of bases) {
        if (!plan.has(b.slug)) continue
        for (const c of b.covers)
          if (c.badgeSlug === badge.slug)
            coveredBy.set(c.reqId, [...(coveredBy.get(c.reqId) ?? []), b.title])
      }
      const covered = coveredLeavesForBadge(badge.slug, plan, bases)
      setView({ ticked: coveredTicks(badge, covered), coveredBy })
      setLoaded(true)
    }
    sync()
    return onPlanChange(sync)
  }, [badge.slug, bases])

  const covered = useMemo(() => new Set([...view.coveredBy.keys()]), [view.coveredBy])
  const tally = useMemo(() => badgeCoverage(badge, covered).tally, [badge, covered])

  const ctx: Ctx = { ticked: view.ticked, coveredBy: view.coveredBy }

  return (
    <div>
      <div class="mb-6 flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:px-5">
        {loaded ? (
          <>
            <ProgressRing percent={tally.percent} complete={tally.complete} size={64} stroke={7} />
            <div class="flex-1">
              <p class="text-sm font-semibold text-slate-700">
                {tally.complete ? (
                  <span class="text-scout-green">Your plan completes this badge</span>
                ) : tally.started ? (
                  <>
                    Your plan covers {tally.done} of {tally.needed}{' '}
                    {badge.stages ? 'stages' : 'requirements'}
                  </>
                ) : (
                  'No base in your plan covers this badge yet'
                )}
              </p>
              <p class="text-xs text-slate-500">
                {tally.complete
                  ? 'Every requirement is covered by a base you have planned.'
                  : 'Add the bases below to your plan to cover more.'}
              </p>
            </div>
          </>
        ) : (
          <>
            <div class="h-16 w-16 shrink-0 animate-pulse rounded-full bg-slate-200" />
            <div class="flex-1 space-y-2">
              <div class="h-4 w-48 animate-pulse rounded bg-slate-200" />
              <div class="h-3 w-32 animate-pulse rounded bg-slate-200" />
            </div>
          </>
        )}
      </div>

      {badge.stages
        ? badge.stages.map((stage, i) => (
            <StageSection key={i} stage={stage} index={i} verdict={stageVerdicts?.[i]} {...ctx} />
          ))
        : badge.unit && <UnitView unit={badge.unit} {...ctx} />}
    </div>
  )
}

interface Ctx {
  ticked: Ticked
  coveredBy: Map<string, string[]>
}

const pctOf = (t: { done: number; needed: number }): number =>
  t.needed ? Math.round((t.done / t.needed) * 100) : 100

function StageSection({
  stage,
  index,
  verdict,
  ...ctx
}: { stage: Stage; index: number; verdict?: Category } & Ctx) {
  const t = unitTally(stage, ctx.ticked)
  return (
    <section
      class={`mb-4 overflow-hidden rounded-xl border bg-white ${
        t.satisfied ? 'border-scout-green/50' : 'border-slate-200'
      }`}
    >
      <div class="flex items-center gap-2 p-4">
        <span class="shrink-0">
          <ProgressRing
            percent={pctOf(t)}
            complete={t.satisfied}
            size={28}
            stroke={3}
            label={false}
            center={index + 1}
          />
        </span>
        <h3 class="flex-1 font-semibold text-slate-800">{stage.label}</h3>
        {verdict && <SuitChip category={verdict} />}
      </div>
      <div class="border-t border-slate-100 px-4 pt-3 pb-4">
        <RequirementList nodes={[...stage.mandatory, ...stage.optional]} {...ctx} />
      </div>
    </section>
  )
}

function UnitView({ unit, ...ctx }: { unit: Unit } & Ctx) {
  return (
    <div class="space-y-4">
      {unit.requirementsIntroHtml && <Prose html={unit.requirementsIntroHtml} />}
      <RequirementList nodes={unit.mandatory} {...ctx} />

      {unit.optional.length > 0 && (
        <ChooseGroup
          options={unit.optional}
          n={unit.optionsToQualify}
          label={`Choose ${unit.optionsToQualify} of the following`}
          introHtml={unit.optionsIntroHtml}
          {...ctx}
        />
      )}
    </div>
  )
}

function RequirementList({ nodes, ...ctx }: { nodes: ReqNode[] } & Ctx) {
  return (
    <ul class="space-y-3">
      {nodes.map((node) => (
        <li key={node.id}>
          <Requirement node={node} {...ctx} />
        </li>
      ))}
    </ul>
  )
}

function Requirement({ node, ...ctx }: { node: ReqNode } & Ctx) {
  const t = nodeTally(node, ctx.ticked)

  // Branch with children: a do-all group or a choose-N group.
  if (node.children.length > 0) {
    if (typeof node.requiredOfChildren === 'number') {
      return (
        <div>
          <p class="font-medium text-slate-800">{node.title}</p>
          {node.notesHtml && <Prose html={node.notesHtml} />}
          <div class="mt-2">
            <ChooseGroup options={node.children} n={node.requiredOfChildren} {...ctx} />
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
          <RequirementList nodes={node.children} {...ctx} />
        </div>
      </div>
    )
  }

  // Leaf: covered by a base in the plan, or not.
  const done = t.satisfied
  const via = ctx.coveredBy.get(node.id)
  return (
    <div class="flex items-start gap-3">
      <Box done={done} />
      <div>
        <span class={done ? 'text-slate-700' : 'text-slate-800'}>
          {node.title}
          {node.repeatTimes > 1 && (
            <span class="text-xs text-slate-500"> ({node.repeatTimes} times)</span>
          )}
          <SuitChip category={node.suitability} />
        </span>
        {node.notesHtml && <Prose html={node.notesHtml} />}
        {via && <Attribution titles={via} />}
      </div>
    </div>
  )
}

// "Pick N" context: each option shows covered state and which base covers it.
function ChooseGroup({
  options,
  n,
  label,
  introHtml,
  ...ctx
}: { options: ReqNode[]; n: number; label?: string; introHtml?: string } & Ctx) {
  const chosen = options.filter((o) => nodeTally(o, ctx.ticked).satisfied).length
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
          {chosen} of {n} covered
        </span>
      </p>
      {introHtml && <Prose html={introHtml} />}
      <ul class="space-y-2">
        {options.map((o) => (
          <li key={o.id}>
            <Option option={o} {...ctx} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function Option({ option, ...ctx }: { option: ReqNode } & Ctx) {
  const done = nodeTally(option, ctx.ticked).satisfied
  const via = ctx.coveredBy.get(option.id)

  const body =
    option.children.length > 0 ? (
      <div class="mt-2">
        {typeof option.requiredOfChildren === 'number' ? (
          <ChooseGroup options={option.children} n={option.requiredOfChildren} {...ctx} />
        ) : (
          <RequirementList nodes={option.children} {...ctx} />
        )}
      </div>
    ) : null

  return (
    <div
      class={`rounded-xl border p-3 ${
        done ? 'border-scout-purple bg-scout-purple/10' : 'border-slate-200 bg-white'
      }`}
    >
      <div class="flex items-start gap-3">
        <Box done={done} />
        <div class="flex-1">
          <span class={`font-medium ${done ? 'text-scout-purple-dark' : 'text-slate-800'}`}>
            {option.title}
            {option.children.length === 0 && <SuitChip category={option.suitability} />}
          </span>
          {option.notesHtml && <Prose html={option.notesHtml} />}
          {via && <Attribution titles={via} />}
        </div>
      </div>
      {body}
    </div>
  )
}

// Read-only tick box: filled when a planned base covers the requirement.
function Box({ done }: { done: boolean }) {
  return (
    <span
      class={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-white ${
        done ? 'border-scout-green bg-scout-green' : 'border-slate-300 bg-white'
      }`}
    >
      {done && <Check size={14} stroke-width={3} />}
    </span>
  )
}

function Attribution({ titles }: { titles: string[] }) {
  return <p class="mt-0.5 text-xs font-medium text-scout-green">via {titles.join(', ')}</p>
}

// Whether this requirement is doable in an evening at our HQ. Unclassified leaves
// stay quiet - no chip - so the list is not littered until the data is seeded.
function SuitChip({ category }: { category: Category }) {
  if (category === 'unknown') return null
  const m = SUIT_META[category]
  return (
    <span
      class={`ml-1.5 inline-block rounded-full px-1.5 py-0.5 align-middle text-[11px] font-semibold ${m.chip}`}
    >
      {m.short}
    </span>
  )
}

function Prose({ html }: { html: string }) {
  return <div class={`mt-1 ${PROSE}`} dangerouslySetInnerHTML={{ __html: html }} />
}
