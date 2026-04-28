import {
  type ElementType,
  type ReactElement,
  type Ref,
  cloneElement,
  createElement,
  isValidElement
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

/**
 * The shape Roadie components accept for the `render` prop. Mirrors
 * Base UI's contract so the same mental model works across every
 * Roadie surface, regardless of whether the underlying primitive is
 * Base UI or in-house.
 *
 * - **Element form:** `<a href='/x' className='extra' />` — swap the
 *   underlying tag, optionally with extra props that merge with the
 *   component's defaults.
 * - **Component form:** `<NextLink href='/x' />` — swap the rendered
 *   component entirely. The component must accept the props the
 *   default element would have received.
 * - **Function form:** `(defaultProps) => <a {...defaultProps} data-x />`
 *   — full control with the default props in hand.
 */
export type RoadieRenderProp<P = Record<string, unknown>> =
  | ReactElement
  | ((defaultProps: P) => ReactElement)

type AnyProps = Record<string, unknown> & {
  className?: string
  style?: React.CSSProperties
  ref?: Ref<unknown>
}

function mergeRefs<T>(a: Ref<T> | undefined, b: Ref<T> | undefined): Ref<T> {
  if (!a) return b ?? (() => {})
  if (!b) return a
  return (node: T | null) => {
    if (typeof a === 'function') a(node)
    else if (a) (a as { current: T | null }).current = node
    if (typeof b === 'function') b(node)
    else if (b) (b as { current: T | null }).current = node
  }
}

/**
 * Merge two prop bags following Base UI's convention:
 * - `className` concatenates (`cn` → tailwind-merge applies)
 * - `style` shallow-merges with override winning
 * - `on*` event handlers chain (default first, then override)
 * - `ref` merges so both refs receive the node
 * - everything else: override wins (override.X over default.X)
 */
function mergeProps(defaults: AnyProps, overrides: AnyProps): AnyProps {
  const merged: AnyProps = { ...defaults, ...overrides }

  if (defaults.className !== undefined || overrides.className !== undefined) {
    merged.className = cn(defaults.className, overrides.className)
  }

  if (defaults.style !== undefined || overrides.style !== undefined) {
    merged.style = { ...defaults.style, ...overrides.style }
  }

  for (const key of Object.keys(merged)) {
    if (
      key.startsWith('on') &&
      typeof defaults[key] === 'function' &&
      typeof overrides[key] === 'function'
    ) {
      const defaultHandler = defaults[key] as (...args: unknown[]) => unknown
      const overrideHandler = overrides[key] as (...args: unknown[]) => unknown
      merged[key] = (...args: unknown[]) => {
        defaultHandler(...args)
        overrideHandler(...args)
      }
    }
  }

  if (defaults.ref !== undefined || overrides.ref !== undefined) {
    merged.ref = mergeRefs(defaults.ref, overrides.ref) as Ref<unknown>
  }

  return merged
}

/**
 * Render a Roadie component as `defaultElement` with `defaultProps`
 * unless the consumer passed a `render` prop, in which case use their
 * element / component / function instead.
 *
 * The `render` prop is the universal escape hatch for every Roadie
 * component. Use `resolveRender` when wrapping non-Base-UI primitives
 * (Card, Breadcrumb.Link, Carousel.TitleLink) so they behave
 * consistently with Base UI consumers like Button and Tabs.Tab.
 *
 * **This is not a React hook** — it never calls hooks internally and is
 * safe to call inside conditional branches. Named without the `use`
 * prefix on purpose, so `eslint-plugin-react-hooks` and the rules of
 * hooks don't apply to call sites.
 */
export function resolveRender<P extends AnyProps>(
  defaultElement: ElementType,
  defaultProps: P,
  render: RoadieRenderProp<P> | undefined
): ReactElement {
  if (render === undefined) {
    return createElement(defaultElement, defaultProps)
  }

  if (typeof render === 'function') {
    return render(defaultProps)
  }

  if (isValidElement(render)) {
    const renderProps = (render.props ?? {}) as AnyProps
    const merged = mergeProps(defaultProps, renderProps)
    return cloneElement(render, merged)
  }

  // Fallback — shouldn't be reachable with proper typing.
  return createElement(defaultElement, defaultProps)
}
