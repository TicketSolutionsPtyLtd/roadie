'use client'

import {
  type ReactNode,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore
} from 'react'

import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import type { Intent, TokenFamily } from '@roadie-core/tokens'

import {
  GROUP_NOTES,
  TOKEN_FAMILY_ORDER,
  TOKEN_FAMILY_PAGES
} from '@/lib/token-families'
import type { TokenEntry } from '@/lib/tokens'

import { Button } from '@oztix/roadie-components/button'
import { EmptyState } from '@oztix/roadie-components/empty-state'
import { Field } from '@oztix/roadie-components/field'
import { Select } from '@oztix/roadie-components/select'
import { Tabs } from '@oztix/roadie-components/tabs'

import { RelatedLinks } from '../RelatedLinks'
import { TokenRow } from './TokenRow'

const INTENT_OPTIONS: Intent[] = [
  'neutral',
  'brand',
  'brand-secondary',
  'accent',
  'danger',
  'success',
  'warning',
  'info'
]

const KIND_OPTIONS = {
  all: 'All kinds',
  variable: 'Variables',
  utility: 'Classes',
  keyframes: 'Keyframes',
  variant: 'Variants'
} as const

type Kind = keyof typeof KIND_OPTIONS
type Family = TokenFamily | 'all'

const sentence = (text: string) =>
  text[0]!.toUpperCase() + text.slice(1).replace(/-/g, ' ')

function haystack(token: TokenEntry) {
  const family = TOKEN_FAMILY_PAGES[token.family as TokenFamily]
  return [
    token.name,
    ...(token.classes ?? []),
    token.value?.light,
    token.value?.dark,
    token.resolved?.light,
    token.description,
    token.group,
    family?.title,
    family?.aliases
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/** 0 for an exact name or class, 1 for a prefix, 2 for a name match, 3 for anything else. */
function rank(token: TokenEntry, needle: string) {
  const names = [
    token.name,
    token.name.replace(/^--/, ''),
    ...(token.classes ?? [])
  ]
  if (names.includes(needle)) return 0
  if (names.some((name) => name.startsWith(needle))) return 1
  if (names.some((name) => name.includes(needle))) return 2
  return 3
}

function groupBy<T>(items: T[], key: (item: T) => string) {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const name = key(item)
    groups.set(name, [...(groups.get(name) ?? []), item])
  }
  return [...groups]
}

type Filters = { query: string; family: Family; kind: Kind; intent: Intent }

const DEFAULT_FILTERS: Filters = {
  query: '',
  family: 'all',
  kind: 'all',
  intent: 'neutral'
}

function parseFilters(search: string): Filters {
  const params = new URLSearchParams(search)
  const family = params.get('family')
  const kind = params.get('kind')
  const intent = params.get('intent')
  return {
    query: params.get('q') ?? '',
    family: (family && family in TOKEN_FAMILY_PAGES ? family : 'all') as Family,
    kind: (kind && kind in KIND_OPTIONS ? kind : 'all') as Kind,
    intent: (INTENT_OPTIONS.includes(intent as Intent)
      ? intent
      : 'neutral') as Intent
  }
}

const urlListeners = new Set<() => void>()

function subscribeToUrl(listener: () => void) {
  urlListeners.add(listener)
  window.addEventListener('popstate', listener)
  return () => {
    urlListeners.delete(listener)
    window.removeEventListener('popstate', listener)
  }
}

function writeFilters(filters: Filters) {
  const params = new URLSearchParams(window.location.search)
  const set = (key: string, value: string, fallback: string) =>
    value && value !== fallback ? params.set(key, value) : params.delete(key)
  set('q', filters.query, '')
  set('family', filters.family, 'all')
  set('kind', filters.kind, 'all')
  set('intent', filters.intent, 'neutral')
  const search = params.toString()
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${search ? `?${search}` : ''}`
  )
  urlListeners.forEach((listener) => listener())
}

/** Filters kept in the URL on the reference, so a search can be linked; local state elsewhere. */
function useFilters(inUrl: boolean) {
  const search = useSyncExternalStore(
    subscribeToUrl,
    () => window.location.search,
    () => ''
  )
  const [local, setLocal] = useState(DEFAULT_FILTERS)
  const filters = useMemo(
    () => (inUrl ? parseFilters(search) : local),
    [inUrl, search, local]
  )
  const update = useCallback(
    (patch: Partial<Filters>) =>
      inUrl
        ? writeFilters({ ...parseFilters(window.location.search), ...patch })
        : setLocal((current) => ({ ...current, ...patch })),
    [inUrl]
  )
  return [filters, update] as const
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function subscribeToReducedMotion(listener: () => void) {
  const query = window.matchMedia(REDUCED_MOTION)
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}

const useReducedMotion = () =>
  useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false
  )

/** On the reference it filters by family and kind in the URL; on a family page it lists that family by group. */
export function TokenBrowser({
  tokens,
  reference = false,
  intentPicker = reference,
  label
}: {
  tokens: TokenEntry[]
  reference?: boolean
  intentPicker?: boolean
  label: string
}) {
  const [{ query, family, kind, intent }, update] = useFilters(reference)
  const inputRef = useRef<HTMLInputElement>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (event.key !== '/' || target.closest('input, textarea, select')) return
      event.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])

  const deferredQuery = useDeferredValue(query)
  const needle = deferredQuery.trim().toLowerCase()

  const indexed = useMemo(
    () => tokens.map((token) => ({ token, text: haystack(token) })),
    [tokens]
  )

  const results = useMemo(() => {
    const words = needle.split(/\s+/).filter(Boolean)
    const matches = indexed
      .filter(
        ({ token, text }) =>
          (family === 'all' || token.family === family) &&
          (kind === 'all' ||
            token.kind === kind ||
            (kind === 'utility' && token.kind === 'class')) &&
          words.every((word) => text.includes(word))
      )
      .map(({ token }) => token)
    return needle === ''
      ? matches
      : matches
          .map((token, order) => ({ token, order, score: rank(token, needle) }))
          .sort((a, b) => a.score - b.score || a.order - b.order)
          .map(({ token }) => token)
  }, [indexed, needle, family, kind])

  const clear = () => {
    update({ query: '', family: 'all', kind: 'all' })
    inputRef.current?.focus()
  }

  const row = (token: TokenEntry, caption?: string) => (
    <TokenRow
      key={`${token.kind}:${token.name}`}
      token={token}
      query={needle}
      intent={intent}
      caption={caption}
    />
  )

  const list = 'grid divide-y divide-subtler'
  const GroupHeading = reference ? 'h3' : 'h2'

  const familyTabs = reference ? (
    <Tabs.List aria-label='Token family' className='w-full'>
      {(['all', ...TOKEN_FAMILY_ORDER] as Family[]).map((option) => (
        <Tabs.Tab key={option} value={option}>
          {option === 'all' ? 'All' : TOKEN_FAMILY_PAGES[option].title}
        </Tabs.Tab>
      ))}
      <Tabs.Indicator />
    </Tabs.List>
  ) : null

  const body = (
    <div className='grid gap-5'>
      <div className='grid gap-3'>
        <Field role='search' className='relative'>
          <Field.Label className='sr-only'>{label}</Field.Label>
          <Field.Input
            ref={inputRef}
            type='search'
            size='lg'
            aria-label={label}
            placeholder={label}
            value={query}
            onChange={(event) => update({ query: event.target.value })}
            className='emphasis-raised rounded-full bg-raised ps-11 pe-4 placeholder:text-subtler'
          />
          <MagnifyingGlassIcon
            aria-hidden
            weight='bold'
            className='pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-subtle'
          />
        </Field>

        {familyTabs}

        {reference || intentPicker ? (
          <div className='flex flex-wrap items-center gap-3'>
            {reference ? (
              <Select
                value={kind}
                onValueChange={(value) => update({ kind: value as Kind })}
              >
                <Select.Trigger aria-label='Kind' className='w-auto'>
                  <Select.Value>
                    {(value: string) => KIND_OPTIONS[value as Kind]}
                  </Select.Value>
                  <Select.Icon />
                </Select.Trigger>
                <Select.Content>
                  {Object.entries(KIND_OPTIONS).map(([value, text]) => (
                    <Select.Item key={value} value={value}>
                      {text}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            ) : null}
            {intentPicker ? (
              <Select
                value={intent}
                onValueChange={(value) => update({ intent: value as Intent })}
              >
                <Select.Trigger
                  aria-label='Preview in intent'
                  className='w-auto'
                >
                  <Select.Value>
                    {(value: string) => `Preview in ${sentence(value)}`}
                  </Select.Value>
                  <Select.Icon />
                </Select.Trigger>
                <Select.Content>
                  {INTENT_OPTIONS.map((option) => (
                    <Select.Item key={option} value={option}>
                      {sentence(option)}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            ) : null}
            <p aria-live='polite' className='ms-auto text-sm text-subtle'>
              {results.length === tokens.length
                ? `${tokens.length} tokens`
                : `${results.length} of ${tokens.length} tokens`}
            </p>
          </div>
        ) : null}
      </div>

      {reducedMotion && tokens.some((token) => token.family === 'motion') ? (
        <p className='text-sm text-subtle'>
          Reduced motion is on, so previews jump to their end state.
        </p>
      ) : null}

      <Results
        panel={reference ? family : undefined}
        className={
          intent === 'neutral' ? 'grid gap-10' : `grid gap-10 intent-${intent}`
        }
      >
        {results.length === 0 ? (
          <EmptyState size='sm'>
            <EmptyState.IconTile>
              <MagnifyingGlassIcon weight='bold' />
            </EmptyState.IconTile>
            <EmptyState.Title>No tokens found</EmptyState.Title>
            <EmptyState.Description>
              Nothing matches &ldquo;{query.trim()}&rdquo;. Try a name, a class
              or a word like &ldquo;shadow&rdquo;.
            </EmptyState.Description>
            <EmptyState.Actions>
              <Button onClick={clear}>Clear search</Button>
            </EmptyState.Actions>
          </EmptyState>
        ) : needle !== '' ? (
          <ul className={list}>
            {results.map((token) =>
              row(
                token,
                `${TOKEN_FAMILY_PAGES[token.family as TokenFamily].title} · ${token.group}`
              )
            )}
          </ul>
        ) : (
          groupBy(results, (token) => token.family).map(([name, members]) => {
            const page = TOKEN_FAMILY_PAGES[name as TokenFamily]
            const groups = groupBy(members, (token) => token.group).map(
              ([group, entries]) => (
                <section key={group} className='grid gap-1'>
                  <div className='flex items-baseline justify-between gap-3'>
                    <GroupHeading
                      id={`${name}-${group}`.toLowerCase().replace(/\W+/g, '-')}
                      className='text-display-ui-5 text-strong'
                    >
                      {group}
                    </GroupHeading>
                    <p className='text-sm text-subtler'>{entries.length}</p>
                  </div>
                  {GROUP_NOTES[group] ? (
                    <p className='text-sm text-subtle'>{GROUP_NOTES[group]}</p>
                  ) : null}
                  <ul className={list}>{entries.map((token) => row(token))}</ul>
                </section>
              )
            )
            return reference ? (
              <section key={name} className='grid gap-6'>
                <div className='grid gap-1'>
                  <h2 id={name} className='text-display-ui-3 text-strong'>
                    {page.title}
                  </h2>
                  <RelatedLinks label='Guidance' links={page.guidance} />
                </div>
                {groups}
              </section>
            ) : (
              <div key={name} className='grid gap-10'>
                {groups}
              </div>
            )
          })
        )}
      </Results>
    </div>
  )

  return reference ? (
    <Tabs
      value={family}
      onValueChange={(value) => update({ family: value as Family })}
      emphasis='subtler'
      size='sm'
    >
      {body}
    </Tabs>
  ) : (
    body
  )
}

/** The result list; on the reference it is the family tabs' panel. */
function Results({
  panel,
  className,
  children
}: {
  panel?: string
  className: string
  children: ReactNode
}) {
  return panel ? (
    <Tabs.Panel value={panel} className={className}>
      {children}
    </Tabs.Panel>
  ) : (
    <div className={className}>{children}</div>
  )
}
