import { ArrowSquareOutIcon } from '@phosphor-icons/react'

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
          key={`${index}-${href}-${label}`}
          href={href}
          size='lg'
          intent={index === 0 ? 'accent' : undefined}
          emphasis={index === 0 ? 'strong' : 'normal'}
        >
          {label}
          {isExternal(href) && (
            <ArrowSquareOutIcon weight='bold' className='size-4' aria-hidden />
          )}
        </Button>
      ))}
    </div>
  )
}

function isExternal(href: string) {
  return /^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(href)
}
