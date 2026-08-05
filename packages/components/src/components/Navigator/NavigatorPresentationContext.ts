'use client'

import { createContext } from 'react'

/**
 * Which surface a `Navigator.Item` is currently rendering into. The rail and
 * the mobile strip render the *same authored elements* through different
 * parents, so the item can't infer this from its own props.
 */
export type NavigatorPresentation = 'rail' | 'strip'

export const NavigatorPresentationContext =
  createContext<NavigatorPresentation>('rail')
