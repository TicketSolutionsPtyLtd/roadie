'use client'

import { type ComponentPropsWithoutRef, useRef } from 'react'

import { useScrollRegion } from '@oztix/roadie-components/scroll-region'

/**
 * A `.prose-scroll` for the docs' own `.prose` wrapper, which isn't the Prose
 * component, so it takes Prose's scroll region from the hook.
 */
export function ProseScroll(
  props: Omit<ComponentPropsWithoutRef<'div'>, 'className'>
) {
  const ref = useRef<HTMLDivElement>(null)
  useScrollRegion(ref)
  return <div ref={ref} className='prose-scroll is-focusable' {...props} />
}
