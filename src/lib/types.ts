// Display shapes: the requirement tree with its text, resolved at build time.
// Each extends the structural progress interfaces so the same value can be fed
// straight into the completion math.

import type { BadgeType, Category, ProgressNode, ProgressUnit } from './progress'

export interface ReqNode extends ProgressNode {
  title: string
  notesHtml: string
  optional: boolean
  // leaf suitability; 'unknown' until classified (data/suitability/<badge>.json)
  suitability: Category
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
