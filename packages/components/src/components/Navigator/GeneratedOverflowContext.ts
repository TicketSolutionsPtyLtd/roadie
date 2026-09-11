'use client'

import { createContext } from 'react'

// Tells Content's generated More pane apart from a declared one; both share a DOM id.
export const GeneratedOverflowContext = createContext(false)
