'use client'

import { useState } from 'react'

export function DataTableShowAll({ label }: { label: string }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <button
      type='button'
      data-slot='data-table-show-all'
      aria-expanded={expanded}
      className='is-interactive justify-self-start rounded-full text-sm font-semibold text-strong underline-offset-4 hover:underline'
      onClick={(event) => {
        const root = event.currentTarget.closest('[data-slot=data-table]')
        const next = !expanded
        root?.toggleAttribute('data-show-all', next)
        setExpanded(next)
      }}
    >
      {expanded ? 'Show fewer columns' : label}
    </button>
  )
}
