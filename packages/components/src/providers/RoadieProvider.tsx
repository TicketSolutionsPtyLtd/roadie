'use client'

import {
  Children,
  Fragment,
  type ReactNode,
  isValidElement,
  use,
  useMemo
} from 'react'

import { DirectionProvider } from '@base-ui/react/direction-provider'

import { ToastProvidedContext } from '../components/Toast/ToastContext'
import {
  ToastProvider,
  type ToastProviderProps
} from '../components/Toast/ToastProvider'
import {
  ToastViewport,
  type ToastViewportProps
} from '../components/Toast/ToastViewport'
import {
  TooltipProvider,
  type TooltipProviderProps
} from '../components/Tooltip/TooltipProvider'
import { useDevWarning } from '../utils/useDevWarning'
import {
  type RoadieLinkComponent,
  RoadieLinkProvider
} from './RoadieLinkProvider'
import { RoadieRootContext } from './RoadieRootContext'
import {
  ThemeContext,
  ThemeProvider,
  type ThemeProviderProps
} from './ThemeProvider'

export type RoadieThemeOptions = Omit<ThemeProviderProps, 'children'>

export type RoadieToastOptions = Omit<ToastProviderProps, 'children'> &
  Pick<ToastViewportProps, 'position' | 'container'>

export type RoadieTooltipOptions = Omit<TooltipProviderProps, 'children'>

export type RoadieProviderProps = {
  children?: ReactNode
  /** Your router's Link, such as `next/link`. Internal hrefs render through it; without one they render plain anchors. */
  link?: RoadieLinkComponent | null
  /** Draws the pending indicator on a `Navigator` frame while an internal link navigates. @default true */
  pendingIndicator?: boolean
  /** `ThemeProvider`'s options: accent colour and dark mode. `false` leaves the theme to you. */
  theme?: RoadieThemeOptions | false
  /** `Toast.Provider`'s options plus the viewport's `position` and `container`. `false` mounts no toasts. */
  toast?: RoadieToastOptions | false
  /** `Tooltip.Provider`'s options, which group every tooltip in the app. `false` leaves tooltips ungrouped. */
  tooltip?: RoadieTooltipOptions | false
  /** The reading direction for Roadie's components. Set `dir` on `<html>` to match. Inherits when unset. */
  direction?: 'ltr' | 'rtl'
}

// A leftover sits straight inside; a scoped one, such as a route's accent, sits deeper.
const WRAPPERS = new Set<unknown>([
  Fragment,
  ThemeProvider,
  ToastProvider,
  RoadieLinkProvider,
  TooltipProvider,
  DirectionProvider
])

function wraps(node: ReactNode, provider: unknown): boolean {
  return Children.toArray(node).some(
    (child) =>
      isValidElement<{ children?: ReactNode }>(child) &&
      (child.type === provider ||
        (WRAPPERS.has(child.type) && wraps(child.props.children, provider)))
  )
}

function duplicateWarning(
  mounts: { theme: boolean; toast: boolean },
  outer: {
    root: { theme: boolean; toast: boolean } | null
    theme: boolean
    toast: boolean
  },
  children: ReactNode
) {
  if (
    outer.root !== null &&
    ((mounts.theme && outer.root.theme) || (mounts.toast && outer.root.toast))
  ) {
    return '[Roadie] RoadieProvider is nested inside another RoadieProvider. Mount one at the app root; for a scoped override, use the individual provider.'
  }
  if (mounts.theme && outer.theme) {
    return '[Roadie] RoadieProvider inside a ThemeProvider mounts a second theme, and both write to the document. Remove the ThemeProvider and pass its options to RoadieProvider as `theme`.'
  }
  if (mounts.toast && outer.toast) {
    return "[Roadie] RoadieProvider inside a Toast.Provider hides it: toasts go to RoadieProvider's own. Remove the Toast.Provider and pass its options to RoadieProvider as `toast`."
  }
  if (mounts.theme && wraps(children, ThemeProvider)) {
    return '[Roadie] ThemeProvider directly inside RoadieProvider duplicates the theme RoadieProvider already mounts. Remove it and pass its options to RoadieProvider as `theme`.'
  }
  if (mounts.toast && wraps(children, ToastProvider)) {
    return '[Roadie] Toast.Provider directly inside RoadieProvider duplicates the toasts RoadieProvider already mounts. Remove it and pass its options to RoadieProvider as `toast`.'
  }
  return false
}

/**
 * Everything a Roadie app needs at its root, in one client provider: routed
 * links, the theme, toasts, grouped tooltips and reading direction. Each part
 * keeps its own context, so a nested individual provider still overrides it.
 */
export function RoadieProvider({
  children,
  link = null,
  pendingIndicator,
  theme = {},
  toast = {},
  tooltip = {},
  direction
}: RoadieProviderProps) {
  const mountsTheme = theme !== false
  const mountsToast = toast !== false
  const root = useMemo(
    () => ({ theme: mountsTheme, toast: mountsToast }),
    [mountsTheme, mountsToast]
  )

  const outer = {
    root: use(RoadieRootContext),
    theme: use(ThemeContext) !== undefined,
    toast: use(ToastProvidedContext)
  }
  useDevWarning(duplicateWarning(root, outer, children))

  let tree = <RoadieRootContext value={root}>{children}</RoadieRootContext>
  if (toast !== false) {
    const { position, container, ...options } = toast
    tree = (
      <ToastProvider {...options}>
        {tree}
        <ToastViewport position={position} container={container} />
      </ToastProvider>
    )
  }
  if (tooltip !== false) {
    tree = <TooltipProvider {...tooltip}>{tree}</TooltipProvider>
  }
  if (theme !== false) {
    tree = <ThemeProvider {...theme}>{tree}</ThemeProvider>
  }
  tree = (
    <RoadieLinkProvider Link={link} pendingIndicator={pendingIndicator}>
      {tree}
    </RoadieLinkProvider>
  )
  if (direction !== undefined) {
    tree = <DirectionProvider direction={direction}>{tree}</DirectionProvider>
  }
  // Cleared, so the providers it mounts don't read themselves as duplicates.
  return <RoadieRootContext value={null}>{tree}</RoadieRootContext>
}

RoadieProvider.displayName = 'RoadieProvider'
