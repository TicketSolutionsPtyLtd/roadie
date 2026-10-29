import { Button } from '@oztix/roadie-components/button'
import { cn } from '@oztix/roadie-core/utils'

import type { BlockAction } from '../Provider'

export type BlockActionsProps = {
  actions?: readonly BlockAction[]
  className?: string
}

/** A block's links as buttons: the first strong, the rest normal, so emphasis is never an option. */
export function BlockActions({ actions = [], className }: BlockActionsProps) {
  if (actions.length === 0) return null
  return (
    <div className={cn('flex flex-wrap gap-4', className)}>
      {actions.map(({ label, href }, index) => (
        <Button
          key={`${href}-${label}`}
          href={href}
          size='lg'
          intent={index === 0 ? 'accent' : undefined}
          emphasis={index === 0 ? 'strong' : 'normal'}
        >
          {label}
        </Button>
      ))}
    </div>
  )
}
