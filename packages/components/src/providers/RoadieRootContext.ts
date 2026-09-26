'use client'

import { createContext } from 'react'

/** The document-wide parts the nearest `RoadieProvider` mounts; `null` outside one. */
export type RoadieRoot = { theme: boolean; toast: boolean }

export const RoadieRootContext = createContext<RoadieRoot | null>(null)
RoadieRootContext.displayName = 'RoadieRootContext'
