/** @jsxImportSource preact */
import { useEffect, useMemo, useState } from 'preact/hooks'
import type { BadgeTree, TreeNode } from '@/lib/bases'
import { Check, Copy, Download, X } from 'lucide-preact'

interface Props {
  badges: { slug: string; title: string }[]
}

interface Picked {
  reqId: string
  title: string
  badgeSlug: string
  badgeTitle: string
}

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const yaml = (s: string): string => JSON.stringify(s)
const lines = (s: string): string[] =>
  s
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)
const splitList = (s: string): string[] =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

function arrayBlock(name: string, items: string[]): string {
  if (items.length === 0) return `${name}: []`
  return [`${name}:`, ...items.map((i) => `  - ${yaml(i)}`)].join('\n')
}

export default function BaseBuilder({ badges }: Props) {
  const [badgeSlug, setBadgeSlug] = useState('')
  const [trees, setTrees] = useState<Record<string, BadgeTree>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [picked, setPicked] = useState<Record<string, Picked>>({})

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('15')
  const [equipment, setEquipment] = useState('')
  const [tags, setTags] = useState('')
  const [body, setBody] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!badgeSlug || trees[badgeSlug]) return
    setLoading(true)
    setError('')
    fetch(`/bases/tree/${badgeSlug}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((tree: BadgeTree) => setTrees((t) => ({ ...t, [badgeSlug]: tree })))
      .catch(() => setError('Could not load that badge.'))
      .finally(() => setLoading(false))
  }, [badgeSlug, trees])

  const badgeTitle = useMemo(
    () => badges.find((b) => b.slug === badgeSlug)?.title ?? badgeSlug,
    [badges, badgeSlug],
  )

  function toggle(node: TreeNode) {
    setPicked((p) => {
      const next = { ...p }
      if (next[node.id]) delete next[node.id]
      else next[node.id] = { reqId: node.id, title: node.title, badgeSlug, badgeTitle }
      return next
    })
  }

  const ids = Object.keys(picked)
  const dur = Number.parseInt(duration, 10)
  const valid = title.trim().length > 0 && Number.isFinite(dur) && dur > 0 && ids.length > 0

  const md = useMemo(() => {
    const out = [
      '---',
      `title: ${yaml(title)}`,
      `description: ${yaml(description)}`,
      `duration: ${Number.isFinite(dur) && dur > 0 ? dur : 0}`,
      arrayBlock('equipment', lines(equipment)),
      arrayBlock('tags', splitList(tags)),
      ['requirements:', ...ids.map((id) => `  - '${id}'`)].join('\n'),
      '---',
      '',
      body.trim(),
      '',
    ]
    return out.join('\n')
  }, [title, description, dur, equipment, tags, ids, body])

  const slug = slugify(title) || 'new-base'

  function copy() {
    void navigator.clipboard.writeText(md).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  function download() {
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'index.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  const byBadge = useMemo(() => {
    const m = new Map<string, Picked[]>()
    for (const p of Object.values(picked)) {
      const arr = m.get(p.badgeTitle) ?? []
      arr.push(p)
      m.set(p.badgeTitle, arr)
    }
    return [...m.entries()]
  }, [picked])

  const field =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-scout-purple focus:outline-none'

  return (
    <div class="grid gap-8 lg:grid-cols-2">
      <div class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-slate-700">Title</label>
          <input
            class={`mt-1 ${field}`}
            value={title}
            onInput={(e) => setTitle(e.currentTarget.value)}
            placeholder="Dealing with bleeding"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700">Description</label>
          <input
            class={`mt-1 ${field}`}
            value={description}
            onInput={(e) => setDescription(e.currentTarget.value)}
            placeholder="One line on what the activity is"
          />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700">Duration (min)</label>
            <input
              type="number"
              min="1"
              class={`mt-1 ${field}`}
              value={duration}
              onInput={(e) => setDuration(e.currentTarget.value)}
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">Tags</label>
            <input
              class={`mt-1 ${field}`}
              value={tags}
              onInput={(e) => setTags(e.currentTarget.value)}
              placeholder="Scouts, Indoor"
            />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700">Equipment (one per line)</label>
          <textarea
            class={`mt-1 ${field}`}
            rows={3}
            value={equipment}
            onInput={(e) => setEquipment(e.currentTarget.value)}
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700">
            Run instructions (markdown)
          </label>
          <textarea
            class={`mt-1 ${field}`}
            rows={5}
            value={body}
            onInput={(e) => setBody(e.currentTarget.value)}
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700">
            Add requirements from a badge
          </label>
          <select
            class={`mt-1 ${field}`}
            value={badgeSlug}
            onChange={(e) => setBadgeSlug(e.currentTarget.value)}
          >
            <option value="">Choose a badge...</option>
            {badges.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.title}
              </option>
            ))}
          </select>
          {loading && <p class="mt-2 text-sm text-slate-500">Loading...</p>}
          {error && <p class="mt-2 text-sm text-scout-red">{error}</p>}
          {badgeSlug && trees[badgeSlug] && (
            <div class="mt-3 max-h-96 overflow-y-auto rounded-lg border border-slate-200 p-3">
              {trees[badgeSlug].groups.map((g, i) => (
                <div key={i} class={i > 0 ? 'mt-4' : ''}>
                  {g.label && (
                    <p class="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                      {g.label}
                    </p>
                  )}
                  <Tree nodes={g.nodes} picked={picked} onToggle={toggle} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div class="space-y-5">
        <section class="rounded-xl border border-slate-200 bg-white p-4">
          <h2 class="text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Selected requirements ({ids.length})
          </h2>
          {byBadge.length === 0 ? (
            <p class="mt-2 text-sm text-slate-500">Pick leaf requirements from a badge.</p>
          ) : (
            <div class="mt-3 space-y-3">
              {byBadge.map(([bt, items]) => (
                <div key={bt}>
                  <p class="text-sm font-medium text-slate-700">{bt}</p>
                  <ul class="mt-1 space-y-1">
                    {items.map((p) => (
                      <li key={p.reqId} class="flex items-start gap-2 text-sm text-slate-600">
                        <button
                          type="button"
                          aria-label={`Remove ${p.title}`}
                          onClick={() => toggle({ id: p.reqId, title: p.title, children: [] })}
                          class="mt-0.5 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <X size={13} />
                        </button>
                        {p.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <section class="rounded-xl border border-slate-200 bg-white p-4">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-sm font-semibold tracking-wide text-slate-500 uppercase">index.md</h2>
            <div class="flex gap-2">
              <button
                type="button"
                onClick={copy}
                disabled={!valid}
                class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-scout-purple disabled:opacity-40"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={download}
                disabled={!valid}
                class="inline-flex items-center gap-1.5 rounded-lg bg-scout-purple px-2.5 py-1 text-xs font-medium text-white hover:bg-scout-purple/90 disabled:opacity-40"
              >
                <Download size={13} /> Download
              </button>
            </div>
          </div>
          <p class="mt-2 text-xs text-slate-500">
            Save as <code class="rounded bg-slate-100 px-1">src/content/bases/{slug}/index.md</code>
          </p>
          {!valid && (
            <p class="mt-2 text-xs text-scout-red">
              Needs a title, a duration and at least one requirement.
            </p>
          )}
          <pre class="mt-3 max-h-96 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
            <code>{md}</code>
          </pre>
        </section>
      </div>
    </div>
  )
}

function Tree({
  nodes,
  picked,
  onToggle,
}: {
  nodes: TreeNode[]
  picked: Record<string, Picked>
  onToggle: (n: TreeNode) => void
}) {
  return (
    <ul class="space-y-1">
      {nodes.map((n) =>
        n.children.length > 0 ? (
          <li key={n.id}>
            <p class="font-medium text-slate-700">{n.title}</p>
            <div class="mt-1 border-l border-slate-200 pl-3">
              <Tree nodes={n.children} picked={picked} onToggle={onToggle} />
            </div>
          </li>
        ) : (
          <li key={n.id}>
            <label class="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                class="mt-0.5 h-4 w-4 accent-scout-purple"
                checked={Boolean(picked[n.id])}
                onChange={() => onToggle(n)}
              />
              {n.title}
            </label>
          </li>
        ),
      )}
    </ul>
  )
}
