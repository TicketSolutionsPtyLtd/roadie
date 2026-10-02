'use client'

import { type ComponentProps, createContext, use, useState } from 'react'

const ShowAllContext = createContext({ expanded: false, toggle: () => {} })

/** The table's root, owning whether every column shows. */
export function DataTableFrame({
  showAll,
  ...props
}: ComponentProps<'div'> & { showAll: boolean }) {
  const [expanded, setExpanded] = useState(false)
  // Collapses with the control, as the button's own state did when it unmounted.
  if (expanded && !showAll) setExpanded(false)
  const toggle = () => setExpanded((current) => !current)
  // An attribute, not `:has([aria-expanded])`, which made Chromium restyle the
  // whole page whenever any disclosure on it opened.
  return (
    <ShowAllContext value={{ expanded, toggle }}>
      <div
        data-slot='data-table'
        data-show-all={expanded ? '' : undefined}
        {...props}
      />
    </ShowAllContext>
  )
}

export function DataTableShowAll({ label }: { label: string }) {
  const { expanded, toggle } = use(ShowAllContext)
  return (
    <button
      type='button'
      data-slot='data-table-show-all'
      aria-expanded={expanded}
      className='is-interactive justify-self-start rounded-full text-sm font-semibold text-strong underline-offset-4 hover:underline'
      onClick={toggle}
    >
      {expanded ? 'Show fewer columns' : label}
    </button>
  )
}
