'use client'

import { createContext } from 'react'

/** Base UI keeps its root's `readOnly` to itself, so the parts read Roadie's copy. */
export const ComboboxReadOnlyContext = createContext(false)
