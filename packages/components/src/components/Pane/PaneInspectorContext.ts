'use client'

import { createContext } from 'react'

import type { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'

// Links a yielded inspector's drawer to a `Pane.InspectorTrigger` in another pane.
export const PaneInspectorContext =
  createContext<DrawerPrimitive.Handle<unknown> | null>(null)
PaneInspectorContext.displayName = 'PaneInspectorContext'

// True inside the drawer a yielded inspector moves into, where its Pane.Header closes the drawer.
export const PaneInspectorDrawerContext = createContext(false)
PaneInspectorDrawerContext.displayName = 'PaneInspectorDrawerContext'
