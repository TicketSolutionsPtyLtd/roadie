'use client'

import { createContext } from 'react'

import type { EmptyStateSize } from './variants'

export const EmptyStateContext = createContext<EmptyStateSize>('md')
