'use client'

import { createContext } from 'react'

import type { RoadieIntent } from '../../variants'

export const CalloutContext = createContext<RoadieIntent | undefined>(undefined)
