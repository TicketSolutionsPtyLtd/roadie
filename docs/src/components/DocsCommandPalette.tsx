'use client'

import { useMemo } from 'react'

import {
  type PageCommand,
  type PageCommandGroup,
  pageCommands
} from '@/lib/page-commands'

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

/** Every docs page behind ⌘K, or Ctrl+K off Apple platforms. */
export function DocsCommandPalette({
  items
}: {
  items: readonly NavigationDestination[]
}) {
  const groups = useMemo(() => pageCommands(items, PINNED), [items])
  return (
    <CommandPalette items={groups} label='Search the docs'>
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
