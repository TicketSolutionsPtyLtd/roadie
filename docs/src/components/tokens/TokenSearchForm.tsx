'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'

import { MagnifyingGlassIcon } from '@phosphor-icons/react'

import { Input } from '@oztix/roadie-components/input'

/** A search box that opens the full reference with the query applied. */
export function TokenSearchForm({ count }: { count: number }) {
  const router = useRouter()
  const [query, setQuery] = useState('')

  return (
    <form
      role='search'
      className='relative grid'
      onSubmit={(event) => {
        event.preventDefault()
        const q = query.trim()
        router.push(
          q
            ? `/tokens/reference?q=${encodeURIComponent(q)}`
            : '/tokens/reference'
        )
      }}
    >
      <Input
        type='search'
        size='lg'
        aria-label='Search tokens'
        placeholder={`Search ${count} tokens`}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className='emphasis-raised rounded-full bg-raised ps-11 pe-4 placeholder:text-subtler'
      />
      <MagnifyingGlassIcon
        aria-hidden
        weight='bold'
        className='pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-subtle'
      />
    </form>
  )
}
