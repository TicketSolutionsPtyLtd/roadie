'use client'

import { type ReactNode, createContext } from 'react'

import type { RoadieIntent } from '../../variants'

export const CalloutContext = createContext<RoadieIntent | undefined>(undefined)

/** A client sibling, so CalloutRoot stays a Server Component and only Callout.Icon reads the intent. */
export function CalloutIntent({
  intent,
  children
}: {
  intent: RoadieIntent | undefined
  children: ReactNode
}) {
  return <CalloutContext value={intent}>{children}</CalloutContext>
}
