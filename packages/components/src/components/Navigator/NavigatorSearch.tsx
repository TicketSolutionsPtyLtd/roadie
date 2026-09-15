'use client'

import { useRef } from 'react'

import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'

import { IconButton } from '../Button/IconButton'
import { Input } from '../Input'
import {
  navigatorSearchBoxClass,
  navigatorSearchCancelClass,
  navigatorSearchCancelSlotClass,
  navigatorSearchClass,
  navigatorSearchFieldClass,
  navigatorSearchIconClass
} from './variants'

export type NavigatorSearchProps = {
  value: string
  onValueChange: (next: string) => void
  /** The field's accessible name, e.g. 'Search components'. */
  label: string
}

/** A section pane's search field, with a Cancel that shows while it has focus. */
export function NavigatorSearch({
  value,
  onValueChange,
  label
}: NavigatorSearchProps) {
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
      data-slot='navigator-search'
      className={navigatorSearchClass}
    >
      <div data-slot='navigator-search-box' className={navigatorSearchBoxClass}>
        <Input
          type='search'
          size='lg'
          emphasis='subtle'
          data-slot='navigator-search-field'
          aria-label={label}
          placeholder='Search'
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return
            event.preventDefault()
            cancel()
          }}
          className={navigatorSearchFieldClass}
        />
        <MagnifyingGlassIcon
          aria-hidden
          weight='bold'
          data-slot='navigator-search-icon'
          className={navigatorSearchIconClass}
        />
      </div>
      <div
        data-slot='navigator-search-cancel-slot'
        className={navigatorSearchCancelSlotClass}
      >
        <IconButton
          data-slot='navigator-search-cancel'
          aria-label='Cancel search'
          size='lg'
          className={navigatorSearchCancelClass}
          // Keeps focus in the field, so Cancel is still showing when the click lands.
          onPointerDown={(event) => event.preventDefault()}
          onClick={cancel}
        >
          <XIcon
            aria-hidden
            weight='bold'
            data-slot='navigator-search-cancel-icon'
            className='size-5'
          />
        </IconButton>
      </div>
    </div>
  )
}

NavigatorSearch.displayName = 'NavigatorSearch'
