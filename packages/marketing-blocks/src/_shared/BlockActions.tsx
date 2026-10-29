import {
  ArrowRightIcon,
  ArrowSquareOutIcon,
  CalendarBlankIcon,
  ChatCircleDotsIcon,
  EnvelopeSimpleIcon,
  PhoneIcon
} from '@phosphor-icons/react'

import { Button } from '@oztix/roadie-components/button'
import { cn } from '@oztix/roadie-core/utils'

import type { BlockAction, BlockActionIcon } from '../Provider'

const ICONS = {
  'arrow-right': ArrowRightIcon,
  calendar: CalendarBlankIcon,
  chat: ChatCircleDotsIcon,
  email: EnvelopeSimpleIcon,
  external: ArrowSquareOutIcon,
  phone: PhoneIcon
} satisfies Record<BlockActionIcon, unknown>

const TRAILING = new Set<BlockActionIcon>(['arrow-right', 'external'])

export type BlockActionsProps = {
  actions?: readonly BlockAction[]
  className?: string
}

/** A block's links as buttons: the first strong, the rest normal, so emphasis is never an option. */
export function BlockActions({ actions = [], className }: BlockActionsProps) {
  if (actions.length === 0) return null
  return (
    <div className={cn('flex flex-wrap gap-4', className)}>
      {actions.map(({ label, href, icon }, index) => {
        const Icon = icon && ICONS[icon]
        const glyph = Icon && (
          <Icon weight='bold' className='size-4' aria-hidden />
        )
        const trailing = icon != null && TRAILING.has(icon)
        return (
          <Button
            key={`${index}-${href}-${label}`}
            href={href}
            intent={index === 0 ? 'accent' : undefined}
            emphasis={index === 0 ? 'strong' : 'normal'}
          >
            {!trailing && glyph}
            {label}
            {trailing && glyph}
          </Button>
        )
      })}
    </div>
  )
}
