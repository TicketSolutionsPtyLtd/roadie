'use client'

import { type ReactNode, isValidElement, use } from 'react'

import { CaretUpIcon } from '@phosphor-icons/react'

import { PaneContext } from './PaneContext'
import { paneTitleCompactVariants } from './variants'

const plainText = (node: ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(plainText).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return plainText(node.props.children)
  }
  return ''
}

// The header's echo for both title arrangements. Internal.
export function PaneTitleCompact({ children }: { children: ReactNode }) {
  const pane = use(PaneContext)
  if (!pane) return null

  return (
    <button
      type='button'
      data-slot='pane-title-compact'
      aria-label='Scroll to top'
      tabIndex={pane.collapsed ? undefined : -1}
      onClick={pane.scrollToTop}
      // Not is-interactive: its :active transform fights this element's scale.
      className={paneTitleCompactVariants({ collapsed: pane.collapsed })}
    >
      <span aria-hidden className='min-w-0 truncate'>
        {plainText(children)}
      </span>
      <CaretUpIcon
        aria-hidden
        weight='bold'
        className='hidden size-3 shrink-0 text-subtle lg:inline-block'
      />
    </button>
  )
}
