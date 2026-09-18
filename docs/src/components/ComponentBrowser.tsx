'use client'

import { useRef, useState } from 'react'

import { ArrowRightIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'

import type { CatalogueCategory } from '@/lib/page-manifest'

import { Button } from '@oztix/roadie-components/button'
import { EmptyState } from '@oztix/roadie-components/empty-state'
import { Field } from '@oztix/roadie-components/field'

import { ComponentSkeleton } from './ComponentSkeleton'
import { PreviewCard, PreviewSection } from './PreviewGrid'

function filterCategories(
  categories: CatalogueCategory[],
  query: string
): CatalogueCategory[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return categories
  return categories.flatMap((category) => {
    if (category.name.toLowerCase().includes(needle)) return [category]
    const entries = category.entries.filter(
      (entry) =>
        entry.title.toLowerCase().includes(needle) ||
        entry.name.includes(needle)
    )
    return entries.length > 0 ? [{ ...category, entries }] : []
  })
}

const countEntries = (categories: CatalogueCategory[]) =>
  categories.reduce((total, { entries }) => total + entries.length, 0)

export function ComponentBrowser({
  categories
}: {
  categories: CatalogueCategory[]
}) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const results = filterCategories(categories, query)
  const count = countEntries(results)

  return (
    <div className='@container grid gap-10'>
      <Field role='search' className='relative'>
        <Field.Label className='sr-only'>Search components</Field.Label>
        <Field.Input
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
      </Field>

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
        results.map((category) => (
          <PreviewSection
            key={category.name}
            title={category.name}
            action={
              category.overviewHref ? (
                <Button
                  href={category.overviewHref}
                  emphasis='subtler'
                  size='sm'
                  aria-label={`${category.name} overview`}
                >
                  Overview
                  <ArrowRightIcon weight='bold' className='size-4' />
                </Button>
              ) : null
            }
          >
            {category.entries.map((entry) => (
              <PreviewCard
                key={entry.name}
                href={entry.href}
                title={entry.title}
              >
                <ComponentSkeleton name={entry.name} />
              </PreviewCard>
            ))}
          </PreviewSection>
        ))
      )}
    </div>
  )
}
