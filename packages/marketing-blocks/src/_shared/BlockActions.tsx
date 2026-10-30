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
import type { BlockIntent } from './surface'

const ICONS = {
  'arrow-right': ArrowRightIcon,
  calendar: CalendarBlankIcon,
  chat: ChatCircleDotsIcon,
  email: EnvelopeSimpleIcon,
  external: ArrowSquareOutIcon,
  phone: PhoneIcon
} satisfies Record<BlockActionIcon, unknown>

const TRAILING = new Set<BlockActionIcon>(['arrow-right', 'external'])

/** A filled surface: a strong or inverted panel, or a photo under a dark scrim. */
export type ActionFill = 'strong' | 'inverted' | 'scrim'

/** The strong action's intent: the block's, or one that stands out from the filled surface it sits on. */
export function strongActionIntent(
  intent: BlockIntent | undefined,
  fill: ActionFill | undefined
): BlockIntent {
  if (!fill) return intent ?? 'accent'
  const panel = intent ?? 'neutral'
  // A strong panel is the intent's own fill, so a neutral one takes accent and a coloured one neutral.
  if (fill === 'strong') return panel === 'neutral' ? 'accent' : 'neutral'
  // Inverted panels and scrims are near the intent's darkest step, where accent reads unless the panel is accent itself.
  return panel === 'accent' ? 'brand-secondary' : 'accent'
}

export type BlockActionsProps = {
  actions?: readonly BlockAction[]
  /** The block's intent, which the strong action takes; accent without one. */
  intent?: BlockIntent
  /** The filled surface the actions sit on, so the strong action picks an intent that stands out from it. */
  fill?: ActionFill
  className?: string
}

/** A block's links as buttons: the first strong, the rest normal, so emphasis is never an option. */
export function BlockActions({
  actions = [],
  intent,
  fill,
  className
}: BlockActionsProps) {
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
            intent={index === 0 ? strongActionIntent(intent, fill) : undefined}
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
