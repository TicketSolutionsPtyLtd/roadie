'use client'

import type { ReactNode } from 'react'

import { Accordion } from '@oztix/roadie-components'

// Client component wrapper for the compound-subcomponent props accordion.
//
// Why a client component instead of using <Accordion> directly inside
// the server-rendered <PropsDefinitions>: Roadie compounds are
// 'use client' modules. When a Next.js *server* component imports one
// via a named specifier (`import { Accordion } from '@oztix/roadie-components'`),
// Next hands the server bundle a client-reference *proxy* that only
// exposes explicitly-named exports. The module-top-level property
// assignments (`Accordion.Item = AccordionItem`) never execute across
// that proxy, so `<Accordion.Item>` resolves to `undefined` at render
// time.
//
// Moving the usage into a client component (like this file) means the
// import is a client-to-client one — no proxy, regular module eval,
// property assignments land on `Accordion` as expected, and the
// dot-notation compound API works. This keeps the Pattern A compound
// authoring model intact without widening the package barrel.
//
// See also the plan follow-up item for a subpath export
// (`@oztix/roadie-components/parts`) as the systemic fix for
// server-component consumers.

export type PropsAccordionItem = {
  displayName: string
  description?: string
  ownCount: number
  body: ReactNode
}

function formatOwnCount(count: number): string {
  if (count === 0) return 'No own props'
  if (count === 1) return '1 own prop'
  return `${count} own props`
}

export function PropsAccordion({ items }: { items: PropsAccordionItem[] }) {
  return (
    <Accordion type='multiple'>
      {items.map((item) => (
        <Accordion.Item key={item.displayName}>
          <Accordion.Trigger>
            <div className='flex min-w-0 items-baseline gap-3'>
              <span className='truncate font-mono text-sm font-semibold'>
                {item.displayName}Props
              </span>
              <span className='shrink-0 text-xs font-normal text-subtle'>
                {formatOwnCount(item.ownCount)}
              </span>
            </div>
          </Accordion.Trigger>
          <Accordion.Content>
            {item.description && (
              <p className='mb-2 px-4 text-sm text-subtle'>
                {item.description}
              </p>
            )}
            <dl className='grid'>{item.body}</dl>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion>
  )
}
