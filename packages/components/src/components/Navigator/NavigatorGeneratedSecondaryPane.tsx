'use client'

import { type FocusEvent, useEffect, useRef, useState } from 'react'

import { MagnifyingGlassIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { IconButton } from '../Button/IconButton'
import { PaneActions } from '../Pane/PaneActions'
import { PaneHeader } from '../Pane/PaneHeader'
import { PaneRoot } from '../Pane/PaneRoot'
import { PaneSearch } from '../Pane/PaneSearch'
import { PaneKindContext } from '../Pane/PaneStackContext'
import { PaneTitle } from '../Pane/PaneTitle'
import { Tooltip } from '../Tooltip'
import type { NavigatorActiveSecondary } from './NavigatorContext'
import { NavigatorSecondaryItems } from './NavigatorSecondaryItems'
import { textOf } from './splitSecondary'
import {
  navigatorSecondaryNavClass,
  navigatorSecondaryPaneClass,
  navigatorSecondarySearchClass
} from './variants'

const isSearchShortcut = (event: KeyboardEvent) =>
  event.key.toLowerCase() === 'k' &&
  (event.metaKey || event.ctrlKey) &&
  !event.altKey &&
  !event.shiftKey

export function NavigatorGeneratedSecondaryPane({
  secondary
}: {
  secondary: NavigatorActiveSecondary
}) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  // Escape and Cancel leave focus nowhere, so it goes back to the toggle.
  const returnFocus = useRef(false)
  const { label, props: nav } = secondary
  const searchLabel = `Search ${textOf(label).toLowerCase()}`

  const focusField = () =>
    searchRef.current?.querySelector<HTMLInputElement>('input')?.focus()

  useEffect(() => {
    if (searching) focusField()
  }, [searching])

  useEffect(() => {
    if (!nav.searchable) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !isSearchShortcut(event)) return
      event.preventDefault()
      if (searching) focusField()
      else setSearching(true)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [nav.searchable, searching])

  const close = () => {
    setQuery('')
    setSearching(false)
  }

  // The toggle closes it itself, so a blur toward it mustn't reopen it on
  // click. Escape and Cancel blur before their cleared query renders.
  const closeOnLeave = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget
    if (next instanceof Node && event.currentTarget.contains(next)) return
    if (next === toggleRef.current) return
    const dismissed = returnFocus.current
    returnFocus.current = false
    if (!dismissed && query !== '') return
    close()
    if (dismissed) toggleRef.current?.focus()
  }

  return (
    <PaneKindContext value='generated-secondary'>
      <PaneRoot
        column='list'
        data-navigator-secondary={secondary.value}
        className={navigatorSecondaryPaneClass}
      >
        <PaneHeader>
          <PaneTitle>{label}</PaneTitle>
          {nav.searchable ? (
            <PaneActions>
              <Tooltip>
                <Tooltip.Trigger
                  render={
                    <IconButton
                      ref={toggleRef}
                      aria-label={searchLabel}
                      aria-expanded={searching}
                      aria-keyshortcuts='Meta+K Control+K'
                      emphasis='normal'
                      onClick={() => (searching ? close() : setSearching(true))}
                    >
                      <MagnifyingGlassIcon weight='bold' className='size-5' />
                    </IconButton>
                  }
                />
                <Tooltip.Content
                  shortcut={['mod', 'k']}
                  aria-hidden
                  className='pointer-coarse:hidden'
                >
                  Search
                </Tooltip.Content>
              </Tooltip>
            </PaneActions>
          ) : null}
          {searching ? (
            <div
              ref={searchRef}
              onBlur={closeOnLeave}
              onKeyDownCapture={(event) => {
                if (event.key === 'Escape') returnFocus.current = true
              }}
              onPointerDownCapture={(event) => {
                const target = event.target as Element
                if (target.closest('[data-slot=pane-search-cancel]'))
                  returnFocus.current = true
              }}
            >
              <PaneSearch
                value={query}
                onValueChange={setQuery}
                aria-label={searchLabel}
                className={navigatorSecondarySearchClass}
              />
            </div>
          ) : null}
        </PaneHeader>
        <nav
          data-slot='navigator-secondary-nav'
          aria-label={nav['aria-label']}
          className={cn(navigatorSecondaryNavClass, nav.className)}
        >
          <NavigatorSecondaryItems showDescriptions={false} query={query} />
        </nav>
      </PaneRoot>
    </PaneKindContext>
  )
}

NavigatorGeneratedSecondaryPane.displayName = 'NavigatorGeneratedSecondaryPane'
