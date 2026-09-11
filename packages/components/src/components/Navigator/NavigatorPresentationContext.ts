'use client'

import { createContext } from 'react'

/** Which surface the same authored `Navigator.Item` is rendering into. */
export type NavigatorPresentation = 'vertical' | 'strip'

export const NavigatorPresentationContext =
  createContext<NavigatorPresentation>('vertical')
