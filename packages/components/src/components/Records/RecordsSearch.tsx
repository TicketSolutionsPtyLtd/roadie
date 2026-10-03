'use client'

import { useRef } from 'react'

import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { IconButton } from '../Button'
import { Input } from '../Input'
import { useRecordsContext } from './context'

export type RecordsSearchProps = {
  /** Names the field too. @default 'Search' */
  placeholder?: string
  className?: string
}

/** A plain-text search across the fields marked searchable. */
export function RecordsSearch({
  placeholder = 'Search',
  className
}: RecordsSearchProps) {
  const { records } = useRecordsContext()
  const value = records.view.query.search
  const fieldRef = useRef<HTMLInputElement>(null)
  return (
    <div data-slot='records-search' className={cn('relative grid', className)}>
      <Input
        ref={fieldRef}
        type='search'
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => records.setSearch(event.target.value)}
        onKeyDown={(event) => {
          // Escape in a composition cancels the composition, not the search.
          if (event.key !== 'Escape' || !value || event.nativeEvent.isComposing)
            return
          event.preventDefault()
          records.setSearch('')
        }}
        // The native clear button would be a second ✕.
        className='ps-9 pe-10 [&::-webkit-search-cancel-button]:appearance-none'
      />
      <MagnifyingGlassIcon
        aria-hidden
        weight='bold'
        className='pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-subtle'
      />
      {value && (
        <IconButton
          aria-label='Clear search'
          size='sm'
          emphasis='subtler'
          className='absolute end-1 top-1/2 -translate-y-1/2'
          // Keeps focus in the field, so the click lands on the button.
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => {
            records.setSearch('')
            fieldRef.current?.focus()
          }}
        >
          <XIcon aria-hidden weight='bold' className='size-4' />
        </IconButton>
      )}
    </div>
  )
}
RecordsSearch.displayName = 'Records.Search'
