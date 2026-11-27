'use client'

import { createContext } from 'react'

import type { MapEngine } from './engine'

/** The engine maps below it use. With none, Map uses the built-in engine. */
export const MapEngineContext = createContext<MapEngine | null>(null)
