// Display shapes: the requirement tree with its text, resolved at build time.
// Each extends the structural progress interfaces so the same value can be fed
// straight into the completion math.

import type { BadgeType, ProgressNode, ProgressUnit } from './progress'

export interface ReqNode extends ProgressNode {
  title: string
  notesHtml: string
  optional: boolean
  children: ReqNode[]
}

export interface Unit extends ProgressUnit {
  requirementsIntroHtml: string
  optionsIntroHtml: string
  mandatory: ReqNode[]
  optional: ReqNode[]
}

export interface Stage extends Unit {
  label: string
  threshold: number
}

export interface ResolvedBadge {
  slug: string
  type: BadgeType
  unit?: Unit
  stages?: Stage[]
}
