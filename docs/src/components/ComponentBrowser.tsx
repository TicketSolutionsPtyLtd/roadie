'use client'

import { useId, useRef, useState } from 'react'

import { ArrowRightIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'

import type { ComponentCategory } from '@/lib/component-manifest'

import { Button } from '@oztix/roadie-components/button'
import { Card } from '@oztix/roadie-components/card'
import { EmptyState } from '@oztix/roadie-components/empty-state'
import { Input } from '@oztix/roadie-components/input'

import { ComponentThumbnail } from './ComponentSkeleton'

function filterCategories(
  categories: ComponentCategory[],
  query: string
): ComponentCategory[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return categories
  return categories.flatMap((category) => {
    if (category.name.toLowerCase().includes(needle)) return [category]
    const components = category.components.filter(
      (component) =>
        component.title.toLowerCase().includes(needle) ||
        component.name.includes(needle)
    )
    return components.length > 0 ? [{ ...category, components }] : []
  })
}

const countComponents = (categories: ComponentCategory[]) =>
  categories.reduce((total, { components }) => total + components.length, 0)

/** Every component as a preview card, grouped by category and filtered by a search. */
export function ComponentBrowser({
  categories
}: {
  categories: ComponentCategory[]
}) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const headingIdPrefix = useId()
  const results = filterCategories(categories, query)
  const count = countComponents(results)

  return (
    <div className='@container grid gap-10'>
      <div role='search' className='relative grid'>
        <Input
          ref={inputRef}
          type='search'
          size='lg'
          aria-label='Search components'
          placeholder='Search components'
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className='emphasis-raised rounded-full bg-raised ps-11 pe-4 placeholder:text-subtler'
        />
        <MagnifyingGlassIcon
          aria-hidden
          weight='bold'
          className='pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-subtle'
        />
      </div>

      <p aria-live='polite' className='sr-only'>
        {query.trim() === ''
          ? ''
          : `${count} ${count === 1 ? 'component' : 'components'} found`}
      </p>

      {results.length === 0 ? (
        <EmptyState size='sm'>
          <EmptyState.IconTile>
            <MagnifyingGlassIcon weight='bold' />
          </EmptyState.IconTile>
          <EmptyState.Title>No components found</EmptyState.Title>
          <EmptyState.Description>
            Nothing matches &ldquo;{query.trim()}&rdquo;. Try a component or
            category name.
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
        results.map((category) => {
          const headingId = `${headingIdPrefix}-${category.name.replace(/\W+/g, '-')}`
          return (
            <section
              key={category.name}
              aria-labelledby={headingId}
              className='grid gap-4'
            >
              <div className='flex items-center justify-between gap-4'>
                <h2 id={headingId} className='text-display-ui-4 text-strong'>
                  {category.name}
                </h2>
                {category.overviewHref ? (
                  <Button
                    href={category.overviewHref}
                    emphasis='subtler'
                    size='sm'
                    aria-label={`${category.name} overview`}
                  >
                    Overview
                    <ArrowRightIcon weight='bold' className='size-4' />
                  </Button>
                ) : null}
              </div>
              <ul className='grid grid-cols-2 gap-3 @md:grid-cols-3 @2xl:grid-cols-4 @2xl:gap-4'>
                {category.components.map((component) => (
                  <li key={component.name} className='grid'>
                    <Card
                      href={`/components/${component.name}`}
                      className='overflow-hidden no-underline'
                    >
                      <ComponentThumbnail name={component.name} />
                      <h3 className='px-3 py-2.5 text-sm font-semibold text-strong'>
                        {component.title}
                      </h3>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          )
        })
      )}
    </div>
  )
}
