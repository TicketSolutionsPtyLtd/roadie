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

// Only the platform's own mod key, so Ctrl+K still deletes to the line's end on Apple.
const isSearchShortcut = (event: KeyboardEvent, platform: KeyPlatform) =>
  event.key.toLowerCase() === 'k' &&
  (platform === 'apple'
    ? event.metaKey && !event.ctrlKey
    : event.ctrlKey && !event.metaKey) &&
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
  const platform = useKeyPlatform()

  const focusField = () =>
    searchRef.current?.querySelector<HTMLInputElement>('input')?.focus()

  useEffect(() => {
    if (searching) focusField()
  }, [searching])

  useEffect(() => {
    if (!nav.searchable || platform === null) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !isSearchShortcut(event, platform)) return
      // On a phone the page covers the list, and a hidden field can't take focus.
      const toggle = toggleRef.current
      const shown =
        toggle?.checkVisibility?.({ visibilityProperty: true }) ?? true
      if (!shown || toggle?.closest('[inert]')) return
      // A modal dialog owns the keyboard, however it marks the page behind it.
      const modal = document.activeElement?.closest('[aria-modal="true"]')
      if (modal && !modal.contains(toggle ?? null)) return
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
    close()
    toggleRef.current?.focus()
  }

  // Escape and Cancel blur before their cleared query renders.
  const closeOnLeave = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget
    if (next instanceof Node && event.currentTarget.contains(next)) return
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
                      aria-keyshortcuts={
                        platform === null
                          ? undefined
                          : platform === 'apple'
                            ? 'Meta+K'
                            : 'Control+K'
                      }
                      emphasis='normal'
                      // Safari never focuses a clicked button, so the field
                      // would blur and close, and this click reopen it.
                      onPointerDown={(event) => {
                        if (searching) event.preventDefault()
                      }}
                      onClick={() =>
                        searching ? dismiss() : setSearching(true)
                      }
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
