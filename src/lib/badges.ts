import type { BadgeType } from './progress'

export const TYPE_LABEL: Record<BadgeType, string> = {
  activity: 'Activity badge',
  challenge: 'Challenge award',
  staged: 'Staged badge',
  top: 'Top award',
}

// Display order for type filters/grouping.
export const TYPE_ORDER: BadgeType[] = ['activity', 'challenge', 'staged', 'top']
