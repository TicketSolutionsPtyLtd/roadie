import {
  CheckCircleIcon,
  InfoIcon,
  WarningCircleIcon,
  WarningIcon
} from '@phosphor-icons/react/ssr'

import type { RoadieIntent } from '../../variants'

const iconClass = 'size-5'

// Same status icons as Toast.
export function statusIcon(intent: RoadieIntent | undefined) {
  switch (intent) {
    case 'success':
      return <CheckCircleIcon weight='bold' className={iconClass} />
    case 'danger':
      return <WarningCircleIcon weight='bold' className={iconClass} />
    case 'warning':
      return <WarningIcon weight='bold' className={iconClass} />
    case 'info':
      return <InfoIcon weight='bold' className={iconClass} />
    default:
      return null
  }
}
