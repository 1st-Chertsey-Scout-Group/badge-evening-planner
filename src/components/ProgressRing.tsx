/** @jsxImportSource preact */
import type { ComponentChildren } from 'preact'

interface Props {
  percent: number
  size?: number
  stroke?: number
  complete?: boolean
  label?: boolean
  // custom centre content (e.g. a stage number); ignored once complete (shows a check)
  center?: ComponentChildren
}

export default function ProgressRing({
  percent,
  size = 56,
  stroke = 6,
  complete = false,
  label = true,
  center,
}: Props) {
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - Math.max(0, Math.min(100, percent)) / 100)
  const color = complete ? 'var(--color-scout-green)' : 'var(--color-scout-purple)'
  return (
    <span
      class="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} class="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e5e7eb"
          stroke-width={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          stroke-width={stroke}
          stroke-linecap="round"
          stroke-dasharray={circumference}
          stroke-dashoffset={offset}
          style={{ transition: 'stroke-dashoffset 300ms ease' }}
        />
      </svg>
      {(() => {
        const content = complete ? '✓' : (center ?? (label ? `${percent}%` : null))
        return content == null ? null : (
          <span class="absolute text-xs font-bold" style={{ color }}>
            {content}
          </span>
        )
      })()}
    </span>
  )
}
