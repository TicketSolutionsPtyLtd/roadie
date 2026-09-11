import type { ReactNode } from 'react'

import { act } from '@testing-library/react'

import {
  type RoadieLinkComponent,
  RoadieLinkProvider
} from '../../providers/RoadieLinkProvider'

// A ScrollArea Viewport measures in a microtask scheduled from a layout
// effect, outside act(); flushing it here keeps synchronous tests quiet.
export async function flushViewportMeasurement() {
  await act(async () => {
    await Promise.resolve()
  })
}

export const FakeIcon = ({
  weight,
  className,
  'data-slot': dataSlot
}: {
  weight?: string
  className?: string
  'data-slot'?: string
}) => (
  <svg
    data-testid='fake-icon'
    data-weight={weight ?? 'none'}
    data-classname={className ?? ''}
    className={className}
    data-slot={dataSlot}
  />
)

export const primaryOf = (orientation: 'vertical' | 'horizontal') =>
  document.querySelector<HTMLElement>(
    `[data-slot="navigator-primary"][data-orientation="${orientation}"]`
  )!

// Follows no link, so jsdom never logs a navigation it can't perform.
export const StubLink: RoadieLinkComponent = ({ href, children, ...rest }) => (
  <a
    href={href}
    {...rest}
    onClick={(event) => {
      rest.onClick?.(event)
      event.preventDefault()
    }}
  >
    {children}
  </a>
)

export const withStubLink = (ui: ReactNode) => (
  <RoadieLinkProvider Link={StubLink}>{ui}</RoadieLinkProvider>
)
