'use client'

import {
  type ComponentType,
  Fragment,
  createElement,
  useRef,
  useState
} from 'react'

import { CheckIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'

import { BRAND_ILLUSTRATIONS } from '@/lib/brand-illustrations'
import { SPOT_ILLUSTRATION_NAMES } from '@/lib/spot-illustrations'

import { Button } from '@oztix/roadie-components/button'
import { EmptyState } from '@oztix/roadie-components/empty-state'
import { Field } from '@oztix/roadie-components/field'
import * as SpotIllustrations from '@oztix/roadie-illustrations/spot'

import { useCopy } from './useCopy'

const wordsOf = (name: string) => name.split(/(?=[A-Z])/)

const TAGS = new Map(
  BRAND_ILLUSTRATIONS.flatMap(({ component, tags }) =>
    component ? [[component, tags] as const] : []
  )
)

/** Illustrations whose name or brand tags hold every word of the query. */
export function filterSpotIllustrations(
  names: readonly string[],
  query: string
) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return names.filter((name) => {
    const haystack = [name, ...wordsOf(name), ...(TAGS.get(name) ?? [])]
      .join(' ')
      .toLowerCase()
    return words.every((word) => haystack.includes(word))
  })
}

function IllustrationTile({ name }: { name: string }) {
  const { copied, failed, copy } = useCopy()
  const words = wordsOf(name)

  return (
    <li className='grid'>
      <button
        type='button'
        onClick={() => copy(name)}
        aria-label={`Copy ${name}`}
        className='is-interactive grid content-start justify-items-center gap-1 rounded-lg px-1 py-2 text-center'
      >
        {createElement(
          SpotIllustrations[
            name as keyof typeof SpotIllustrations
          ] as ComponentType
        )}
        <span className='text-xs text-subtle'>
          {copied ? (
            <span className='inline-flex items-center gap-1 text-strong'>
              <CheckIcon weight='bold' className='size-3' />
              Copied
            </span>
          ) : failed ? (
            'Couldn’t copy'
          ) : (
            // Wraps only between the name's words, never inside one.
            words.map((word, i) => (
              <Fragment key={i}>
                {i > 0 && <wbr />}
                {word}
              </Fragment>
            ))
          )}
        </span>
      </button>
      <span aria-live='polite' className='sr-only'>
        {copied ? `Copied ${name}` : failed ? `Couldn't copy ${name}` : ''}
      </span>
    </li>
  )
}

/** Every spot illustration, searchable by name and theme. Selecting one copies its name. */
export function IllustrationGallery() {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const results = filterSpotIllustrations(SPOT_ILLUSTRATION_NAMES, query)

  return (
    <div data-not-prose data-slot='illustration-gallery' className='grid gap-4'>
      <Field role='search' className='relative'>
        <Field.Label className='sr-only'>Search spot illustrations</Field.Label>
        <Field.Input
          ref={inputRef}
          type='search'
          aria-label='Search spot illustrations'
          placeholder='Search, such as ticket or music'
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className='ps-10'
        />
        <MagnifyingGlassIcon
          aria-hidden
          weight='bold'
          className='pointer-events-none absolute inset-s-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle'
        />
      </Field>

      <p aria-live='polite' className='text-sm text-subtle'>
        {results.length} of {SPOT_ILLUSTRATION_NAMES.length}. Select one to copy
        its name.
      </p>

      {results.length === 0 ? (
        <EmptyState size='sm'>
          <EmptyState.IconTile>
            <MagnifyingGlassIcon weight='bold' />
          </EmptyState.IconTile>
          <EmptyState.Title>No illustrations found</EmptyState.Title>
          <EmptyState.Description>
            Nothing matches &ldquo;{query.trim()}&rdquo;. Try a word such as
            music, tickets, or flower.
          </EmptyState.Description>
          <EmptyState.Actions>
            <Button
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
            >
              Clear search
            </Button>
          </EmptyState.Actions>
        </EmptyState>
      ) : (
        <ul className='grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-1'>
          {results.map((name) => (
            <IllustrationTile key={name} name={name} />
          ))}
        </ul>
      )}
    </div>
  )
}
