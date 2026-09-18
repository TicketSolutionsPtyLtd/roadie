'use client'

import { useRef } from 'react'

import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { IconButton } from '../Button/IconButton'
import { Input } from '../Input'
import {
  paneSearchBoxClass,
  paneSearchCancelClass,
  paneSearchCancelSlotClass,
  paneSearchClass,
  paneSearchFieldClass,
  paneSearchIconClass
} from './variants'

export type PaneSearchProps = {
  value: string
  onValueChange: (next: string) => void
  /** Names the field; defaults to the placeholder. */
  'aria-label'?: string
  /** @default 'Search' */
  placeholder?: string
  className?: string
}

/** A search field for a pane header, with a Cancel that shows while it has focus. Filter your own data. */
export function PaneSearch({
  value,
  onValueChange,
  'aria-label': ariaLabel,
  placeholder = 'Search',
  className
}: PaneSearchProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  const cancel = () => {
    onValueChange('')
    const focused = document.activeElement
    if (focused instanceof HTMLElement && rootRef.current?.contains(focused)) {
      focused.blur()
    }
  }

  return (
    <div
      ref={rootRef}
      data-slot='pane-search'
      className={cn(paneSearchClass, className)}
    >
      <div data-slot='pane-search-box' className={paneSearchBoxClass}>
        <Input
          type='search'
          size='lg'
          emphasis='subtle'
          data-slot='pane-search-field'
          aria-label={ariaLabel ?? placeholder}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return
            event.preventDefault()
            cancel()
          }}
          className={paneSearchFieldClass}
        />
        <MagnifyingGlassIcon
          aria-hidden
          weight='bold'
          data-slot='pane-search-icon'
          className={paneSearchIconClass}
        />
      </div>
      <div
        data-slot='pane-search-cancel-slot'
        className={paneSearchCancelSlotClass}
      >
        <IconButton
          data-slot='pane-search-cancel'
          aria-label='Cancel search'
          size='lg'
          className={paneSearchCancelClass}
          // Keeps focus in the field, so Cancel is still showing when the click lands.
          onPointerDown={(event) => event.preventDefault()}
          onClick={cancel}
        >
          <XIcon aria-hidden weight='bold' className='size-5' />
        </IconButton>
      </div>
    </div>
  )
}

PaneSearch.displayName = 'Pane.Search'
