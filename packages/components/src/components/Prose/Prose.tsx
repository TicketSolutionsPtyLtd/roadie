'use client'

import {
  Children,
  type ComponentProps,
  type ElementType,
  Fragment,
  type ReactElement,
  type ReactNode,
  type Ref,
  cloneElement,
  isValidElement,
  useEffect,
  useState
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { mergeRefs } from '../../utils/mergeRefs'
import { type RoadieRenderProp, resolveRender } from '../../utils/resolveRender'
import {
  SCROLLER_CLASS,
  observeProseScrollRegions
} from '../ScrollRegion/scrollRegion'
import { proseVariants } from './variants'

export type ProseProps<T extends ElementType = 'div'> = {
  /**
   * @deprecated Use `render` instead. `as` will be removed in v3.0.0.
   */
  as?: T
  /**
   * Swaps the underlying element with full control over its shape, such as
   * `render={<article />}`.
   */
  render?: RoadieRenderProp
  className?: string
  /**
   * Body size and heading scale. `sm` uses the UI heading styles for dense
   * content such as an FAQ; `md` and `lg` use the prose heading styles.
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'
} & Omit<ComponentProps<T>, 'as' | 'className' | 'size' | 'render'>

type ElementProps = {
  children?: ReactNode
  className?: unknown
  'data-not-prose'?: unknown
}

const classesOf = ({ className }: ElementProps) =>
  typeof className === 'string' ? className.split(/\s+/) : []

function wrapTable(child: ReactNode): ReactNode {
  if (!isValidElement<ElementProps>(child)) return child
  const { type, props } = child
  const classes = classesOf(props)
  if (type === 'table')
    return (
      <div
        className={cn(
          SCROLLER_CLASS,
          classes.includes('prose-bleed') && 'prose-bleed'
        )}
      >
        {child}
      </div>
    )

  // A component's children may not render where they're written, so only
  // elements and fragments are searched.
  const searchable =
    (typeof type === 'string' || type === Fragment) &&
    props['data-not-prose'] == null &&
    !classes.some((name) => name === 'not-prose' || name === 'prose-scroll')
  if (!searchable) return child
  const children = wrapTables(props.children)
  return children === props.children
    ? child
    : cloneElement(child, undefined, children)
}

/**
 * Wraps each bare table in the JSX in a scroller while rendering, so the
 * server and the client agree and React keeps owning every node.
 */
function wrapTables(children: ReactNode): ReactNode {
  let changed = false
  const wrapped = Children.map(children, (child) => {
    const next = wrapTable(child)
    if (next !== child) changed = true
    return next
  })
  return changed ? wrapped : children
}

/**
 * Prose container for long-form/rich content (CMS output, markdown, user HTML).
 * Renders the core `.prose` class, which styles the nested HTML. Wraps each
 * bare table in a `.prose-scroll`, which keyboard users can reach and scroll
 * while the table overflows.
 */
export function Prose<T extends ElementType = 'div'>({
  as,
  render,
  className,
  size,
  children,
  ...props
}: ProseProps<T> & { children?: ReactNode }): ReactElement {
  const [container, setContainer] = useState<HTMLElement | null>(null)
  const { ref, dangerouslySetInnerHTML } = props as {
    ref?: Ref<HTMLElement>
    dangerouslySetInnerHTML?: unknown
  }
  // React doesn't own HTML set this way, so its tables can be moved.
  const wrapBare = dangerouslySetInnerHTML != null

  useEffect(() => {
    if (!container) return
    return observeProseScrollRegions(container, wrapBare)
  }, [container, wrapBare])

  const setRef = mergeRefs(setContainer, ref)

  const finalProps = {
    'data-slot': 'prose',
    className: cn(proseVariants({ size, className })),
    ...props,
    ref: setRef,
    children: wrapTables(children)
  }

  if (render !== undefined) return resolveRender('div', finalProps, render)

  const Component = (as ?? 'div') as ElementType
  return <Component {...finalProps} />
}

Prose.displayName = 'Prose'
