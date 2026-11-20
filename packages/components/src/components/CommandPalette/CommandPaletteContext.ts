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
