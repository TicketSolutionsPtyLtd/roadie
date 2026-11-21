'use client'

import { createContext, use } from 'react'

const CommandPaletteCloseContext = createContext<() => void>(() => {})

export const CommandPaletteCloseProvider = CommandPaletteCloseContext

export const useCommandPaletteClose = () => use(CommandPaletteCloseContext)

export type CommandPaletteScopeState = {
  /** The chosen type, or null for All. */
  scope: string | null
  setScope: (scope: string | null) => void
  /** The tabs in order, All first as null, once Scopes has rendered. */
  scopes: readonly (string | null)[]
  setScopes: (scopes: readonly (string | null)[]) => void
}

const CommandPaletteScopeContext = createContext<CommandPaletteScopeState>({
  scope: null,
  setScope: () => {},
  scopes: [null],
  setScopes: () => {}
})

export const CommandPaletteScopeProvider = CommandPaletteScopeContext

export const useCommandPaletteScope = () => use(CommandPaletteScopeContext)

export type CommandPalettePageEntry = {
  label: string
  items: readonly unknown[]
  itemToStringValue?: (item: never) => string
}

export type CommandPalettePagesState = {
  /** The open page's value and label, or null on the first page. */
  page: { value: string; label: string } | null
  push: (page: string) => void
  pop: () => void
  register: (value: string, entry: CommandPalettePageEntry) => () => void
}

const CommandPalettePagesContext = createContext<CommandPalettePagesState>({
  page: null,
  push: () => {},
  pop: () => {},
  register: () => () => {}
})

export const CommandPalettePagesProvider = CommandPalettePagesContext

export const useCommandPalettePages = () => use(CommandPalettePagesContext)

const CommandPalettePageValueContext = createContext<string | null>(null)

export const CommandPalettePageValueProvider = CommandPalettePageValueContext

/** Whether this part shows now: a page's own parts only while it's open, and the first page's only while no page is. */
export function useOnOpenPage() {
  const owner = use(CommandPalettePageValueContext)
  const { page } = useCommandPalettePages()
  return (page?.value ?? null) === owner
}
