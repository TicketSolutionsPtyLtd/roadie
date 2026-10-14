import type { ReactNode } from 'react'

import {
  CalendarBlankIcon,
  CircleHalfIcon,
  CurrencyDollarIcon,
  HashIcon,
  TagIcon,
  TextAaIcon,
  ToggleLeftIcon
} from '@phosphor-icons/react/ssr'

import type { RecordsField } from './types'

/** The field's own icon, or one for its type. */
export function fieldIcon(field: RecordsField): ReactNode {
  if (field.icon) return field.icon
  switch (field.type) {
    case 'option':
      return field.status ? (
        <CircleHalfIcon weight='bold' />
      ) : (
        <TagIcon weight='bold' />
      )
    case 'text':
      return <TextAaIcon weight='bold' />
    case 'number':
      return <HashIcon weight='bold' />
    case 'money':
      return <CurrencyDollarIcon weight='bold' />
    case 'date':
      return <CalendarBlankIcon weight='bold' />
    case 'boolean':
      return <ToggleLeftIcon weight='bold' />
  }
}
