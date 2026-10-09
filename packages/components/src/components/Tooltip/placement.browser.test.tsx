import type { ReactNode } from 'react'

import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Tooltip } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'
import { Popover } from '../Popover'

const STILL = '*, *::before, *::after { transition: none !important }'

let removeStylesheets = () => {}
beforeAll(() => {
  const removeRoadie = useStylesheet(roadieCss)
  const removeStill = useStylesheet(STILL)
  removeStylesheets = () => {
    removeRoadie()
    removeStill()
  }
})
afterAll(() => removeStylesheets())
afterEach(() => cleanup())

type Offsets = { sideOffset?: number; alignOffset?: number }

const SURFACES = [
  {
    name: 'Tooltip',
    side: 'top',
    defaultGap: 6,
    open: (offsets: Offsets) => (
      <Tooltip defaultOpen>
        <Tooltip.Trigger>Trigger</Tooltip.Trigger>
        <Tooltip.Content align='start' {...offsets}>
          Content
        </Tooltip.Content>
      </Tooltip>
    )
  },
  {
    name: 'Popover',
    side: 'bottom',
    defaultGap: 8,
    open: (offsets: Offsets) => (
      <Popover defaultOpen>
        <Popover.Trigger>Trigger</Popover.Trigger>
        <Popover.Content align='start' {...offsets}>
          Content
        </Popover.Content>
      </Popover>
    )
  }
] as const

// Room on every side, so the popup never flips or shifts.
function Stage({ children }: { children: ReactNode }) {
  return <div style={{ padding: 160 }}>{children}</div>
}

function placement(side: 'top' | 'bottom') {
  const trigger = screen.getByText('Trigger').getBoundingClientRect()
  // The positioner, not the popup, which scales in as it opens.
  const popup = document
    .querySelector('[data-slot$="-positioner"]')!
    .getBoundingClientRect()
  return {
    gap:
      side === 'top' ? trigger.top - popup.bottom : popup.top - trigger.bottom,
    shift: popup.left - trigger.left
  }
}

describe.each(SURFACES)('$name placement', ({ side, defaultGap, open }) => {
  it(`sits ${defaultGap}px from its trigger, flush with its start edge`, async () => {
    render(<Stage>{open({})}</Stage>)
    await screen.findByText('Content')

    await expect.poll(() => placement(side).gap).toBeCloseTo(defaultGap, 0)
    expect(placement(side).shift).toBeCloseTo(0, 0)
  })

  it('moves by the sideOffset and alignOffset given', async () => {
    render(<Stage>{open({ sideOffset: 10, alignOffset: 12 })}</Stage>)
    await screen.findByText('Content')

    await expect.poll(() => placement(side).gap).toBeCloseTo(10, 0)
    expect(placement(side).shift).toBeCloseTo(12, 0)
  })
})
