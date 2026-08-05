'use client'

import { createContext } from 'react'

// Whether the `Navigator.Overflow` currently rendering is `Navigator.Content`'s
// own generated fallback rather than a consumer's declaration — both render
// through the identical component and share a DOM id, so a signal independent
// of props is what lets the fallback tell itself apart. Internal to
// `Navigator`; never exported from the package.
export const GeneratedOverflowContext = createContext(false)
