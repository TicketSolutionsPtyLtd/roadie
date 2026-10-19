'use client'

import { createContext } from 'react'

/** Hears a toolbar's search take and lose focus, so a narrow toolbar gives it the row. */
export const SearchFocusContext = createContext<
  ((focused: boolean) => void) | null
>(null)
