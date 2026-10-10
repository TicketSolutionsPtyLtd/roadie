'use client'

import {
  type ComponentPropsWithoutRef,
  useEffect,
  useRef,
  useState
} from 'react'

import {
  type RegionName,
  overflowsInline,
  regionName
} from '@/lib/scroll-region'

/**
 * A `.prose-scroll` that keyboard users can reach and scroll once its table
 * overflows. It renders without a tab stop on the server and adds one after
 * measuring, so hydration matches.
 */
export function ProseScroll(
  props: Omit<ComponentPropsWithoutRef<'div'>, 'className'>
) {
  const ref = useRef<HTMLDivElement>(null)
  const [name, setName] = useState<RegionName>()

  useEffect(() => {
    const scroller = ref.current
    if (!scroller) return
    const label = regionName(scroller)
    const observer = new ResizeObserver(() =>
      setName(overflowsInline(scroller) ? label : undefined)
    )
    observer.observe(scroller)
    for (const child of scroller.children) observer.observe(child)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className='prose-scroll is-focusable'
      {...props}
      {...(name && { role: 'region', tabIndex: 0, ...name })}
    />
  )
}
