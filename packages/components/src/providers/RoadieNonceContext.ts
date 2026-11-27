'use client'

import { createContext } from 'react'

/** The CSP nonce `RoadieProvider` was given, for the inline scripts Roadie renders. */
export const RoadieNonceContext = createContext<string | undefined>(undefined)
RoadieNonceContext.displayName = 'RoadieNonceContext'
