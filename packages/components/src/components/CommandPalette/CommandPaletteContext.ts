'use client'

import { createContext, use } from 'react'

const CommandPaletteCloseContext = createContext<() => void>(() => {})

export const CommandPaletteCloseProvider = CommandPaletteCloseContext

export const useCommandPaletteClose = () => use(CommandPaletteCloseContext)
