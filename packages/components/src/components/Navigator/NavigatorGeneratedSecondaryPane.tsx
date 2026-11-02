'use client'

import { type FocusEvent, useEffect, useRef, useState } from 'react'

import { MagnifyingGlassIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { IconButton } from '../Button/IconButton'
import { type KeyPlatform, useKeyPlatform } from '../Kbd/platform'
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

// Mod+/ leaves Mod+K to an app-wide search and / to a page's own. Shift is
// allowed, since some layouts type / with it.
const isSearchShortcut = (event: KeyboardEvent, platform: KeyPlatform) =>
  event.key === '/' &&
  (platform === 'apple'
    ? event.metaKey && !event.ctrlKey
    : event.ctrlKey && !event.metaKey) &&
  !event.altKey

export function NavigatorGeneratedSecondaryPane({
  secondary
}: {
  secondary: NavigatorActiveSecondary
}) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  // Escape and Cancel leave focus nowhere, so it goes back to the toggle.
  const returnFocus = useRef(false)
  // The toggle hides while the field is open, so it takes focus once it's back.
  const focusToggle = useRef(false)
  const { label, props: nav } = secondary
  const searchLabel = `Search ${textOf(label).toLowerCase()}`
  const platform = useKeyPlatform()

  const focusField = () =>
    searchRef.current?.querySelector<HTMLInputElement>('input')?.focus()

  useEffect(() => {
    if (searching) focusField()
    else if (focusToggle.current) toggleRef.current?.focus()
    focusToggle.current = false
  }, [searching])

  useEffect(() => {
    if (!nav.searchable || platform === null) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !isSearchShortcut(event, platform)) return
      // On a phone the page covers the list, and a hidden field can't take focus.
      const actions = actionsRef.current
      const shown =
        actions?.checkVisibility?.({ visibilityProperty: true }) ?? true
      if (!shown || actions?.closest('[inert]')) return
      // A modal dialog owns the keyboard, however it marks the page behind it.
      const modal = document.activeElement?.closest('[aria-modal="true"]')
      if (modal && !modal.contains(actions ?? null)) return
      event.preventDefault()
      if (searching) focusField()
      else setSearching(true)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [nav.searchable, platform, searching])

  const close = () => {
    setQuery('')
    setSearching(false)
  }

  const dismiss = () => {
    focusToggle.current = true
    close()
  }

  // Escape and Cancel blur before their cleared query renders.
  const closeOnLeave = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget
    if (next instanceof Node && event.currentTarget.contains(next)) return
    const dismissed = returnFocus.current
    returnFocus.current = false
    if (!dismissed && query !== '') return
    if (dismissed) dismiss()
    else close()
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
            <PaneActions ref={actionsRef}>
              <Tooltip>
                <Tooltip.Trigger
                  render={
                    <IconButton
                      ref={toggleRef}
                      aria-label={searchLabel}
                      aria-expanded={searching}
                      aria-keyshortcuts={
                        platform === null
                          ? undefined
                          : platform === 'apple'
                            ? 'Meta+/'
                            : 'Control+/'
                      }
                      emphasis='normal'
                      // Invisible, not removed, so the title doesn't jump.
                      className={searching ? 'invisible' : undefined}
                      onClick={() => setSearching(true)}
                    >
                      <MagnifyingGlassIcon weight='bold' className='size-5' />
                    </IconButton>
                  }
                />
                <Tooltip.Content
                  shortcut={['mod', '/']}
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
              // Escape from Cancel, which has no handler of its own.
              onKeyDown={(event) => {
                if (event.key !== 'Escape' || !returnFocus.current) return
                returnFocus.current = false
                dismiss()
              }}
              onClickCapture={(event) => {
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
