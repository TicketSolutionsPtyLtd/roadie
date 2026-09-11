'use client'

import { createContext } from 'react'

// A Group can't read the vertical navigation's folded rows from its own props.
export const NavigatorFoldedContext = createContext<ReadonlySet<string>>(
  new Set()
)
