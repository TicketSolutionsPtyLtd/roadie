'use client'

import { useMemo } from 'react'

import {
  type PageCommand,
  type PageCommandGroup,
  pageCommands
} from '@/lib/page-commands'
import { useRoute } from '@/lib/route'

import { CommandPalette } from '@oztix/roadie-components/command-palette'

import type { NavigationDestination } from './Navigation'

// Navigation pins Appearance outside its sections.
const PINNED: PageCommand[] = [
  {
    label: 'Appearance',
    href: '/appearance',
    keywords: ['theme', 'dark mode', 'light mode']
  }
]

// A live example here binds ⌘K itself, and a page has one owner (decision 0014).
const EXAMPLE_OWNS_SHORTCUT = new Set(['/components/navigator'])

/** Every docs page behind ⌘K, or Ctrl+K off Apple platforms. */
export function DocsCommandPalette({
  items
}: {
  items: readonly NavigationDestination[]
}) {
  const groups = useMemo(() => pageCommands(items, PINNED), [items])
  const route = useRoute()
  return (
    <CommandPalette
      items={groups}
      label='Search the docs'
      shortcut={EXAMPLE_OWNS_SHORTCUT.has(route) ? false : undefined}
    >
      <CommandPalette.Input placeholder='Search the docs' />
      <CommandPalette.List>
        {(group: PageCommandGroup) => (
          <CommandPalette.Group key={group.label} items={group.items}>
            <CommandPalette.GroupLabel>{group.label}</CommandPalette.GroupLabel>
            <CommandPalette.Collection>
              {(page: PageCommand) => (
                <CommandPalette.Item
                  key={page.href}
                  value={page}
                  href={page.href}
                >
                  {page.label}
                </CommandPalette.Item>
              )}
            </CommandPalette.Collection>
          </CommandPalette.Group>
        )}
      </CommandPalette.List>
      <CommandPalette.Empty>No pages match</CommandPalette.Empty>
    </CommandPalette>
  )
}
