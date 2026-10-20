import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'
import { useStylesheet } from '../components/Pane/testUtils'
import { Popover } from '../components/Popover'

// Core's surfaces live in its sheets, but only this package runs browser tests.

let removeRoadie = () => {}
beforeAll(() => {
  removeRoadie = useStylesheet(roadieCss)
})
afterAll(() => removeRoadie())
afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('dark')
})

const RAISED_LIFT =
  'color-mix(in oklch, var(--color-neutral-9) 11%, var(--color-neutral-3))'

function colourOf(background: string) {
  const probe = document.createElement('span')
  probe.style.backgroundColor = background
  document.body.appendChild(probe)
  const colour = getComputedStyle(probe).backgroundColor
  probe.remove()
  return colour
}

function edgeOf(border: string) {
  const probe = document.createElement('span')
  probe.style.border = `1px solid ${border}`
  document.body.appendChild(probe)
  const colour = getComputedStyle(probe).borderTopColor
  probe.remove()
  return colour
}

const fill = (testId: string) =>
  getComputedStyle(screen.getByTestId(testId)).backgroundColor

function renderSurfaces() {
  render(
    <div>
      <div data-testid='raised' className='emphasis-raised'>
        <div data-testid='nested' className='emphasis-raised' />
      </div>
      <div data-testid='floating' className='emphasis-floating' />
      <div
        data-testid='translucent'
        className='emphasis-floating is-translucent'
      />
      <div
        data-testid='brand-floating'
        className='emphasis-floating intent-brand'
      />
      <input aria-label='Name' className='emphasis-field' />
    </div>
  )
}

describe('surfaces in dark mode', () => {
  it('keeps a raised surface on the page on step 3', () => {
    document.documentElement.classList.add('dark')
    renderSurfaces()
    expect(fill('raised')).toBe(colourOf('var(--color-neutral-3)'))
  })

  it('lifts a floating surface above a raised one', () => {
    document.documentElement.classList.add('dark')
    renderSurfaces()
    expect(fill('floating')).toBe(colourOf(RAISED_LIFT))
  })

  it('keeps the lift under a translucent floating surface', () => {
    document.documentElement.classList.add('dark')
    renderSurfaces()
    expect(fill('translucent')).toBe(
      colourOf(`color-mix(in oklch, ${RAISED_LIFT} 88%, transparent)`)
    )
  })

  it('lifts a raised surface inside another one', () => {
    document.documentElement.classList.add('dark')
    renderSurfaces()
    expect(fill('nested')).toBe(colourOf(RAISED_LIFT))
  })

  it('lifts a floating surface in its own intent', () => {
    document.documentElement.classList.add('dark')
    renderSurfaces()
    expect(fill('brand-floating')).toBe(
      colourOf(
        'color-mix(in oklch, var(--color-brand-9) 11%, var(--color-brand-2))'
      )
    )
  })

  it('gives a field an edge that shows on the page', () => {
    document.documentElement.classList.add('dark')
    renderSurfaces()
    expect(getComputedStyle(screen.getByRole('textbox')).borderTopColor).toBe(
      edgeOf('color-mix(in oklch, var(--color-neutral-9) 50%, transparent)')
    )
  })
})

describe('a popover in dark mode', () => {
  it('draws its arrow in the lifted fill of its body', async () => {
    document.documentElement.classList.add('dark')
    render(
      <Popover>
        <Popover.Trigger>Open</Popover.Trigger>
        <Popover.Content>
          <Popover.Arrow />
          <Popover.Body>Door times</Popover.Body>
        </Popover.Content>
      </Popover>
    )
    await userEvent.click(screen.getByText('Open'))
    await screen.findByText('Door times')

    const popup = document.querySelector('[data-slot="popover-popup"]')!
    const arrow = document.querySelector('[data-slot="popover-arrow"] svg')!
    expect(getComputedStyle(popup).backgroundColor).toBe(colourOf(RAISED_LIFT))
    expect(getComputedStyle(arrow).fill).toBe(colourOf(RAISED_LIFT))
  })
})

describe('surfaces in light mode', () => {
  it('keeps raised, nested and floating surfaces on step 1', () => {
    renderSurfaces()
    const step1 = colourOf('var(--color-neutral-1)')
    expect(fill('raised')).toBe(step1)
    expect(fill('nested')).toBe(step1)
    expect(fill('floating')).toBe(step1)
  })

  it('keeps the field’s light edge', () => {
    renderSurfaces()
    expect(getComputedStyle(screen.getByRole('textbox')).borderTopColor).toBe(
      edgeOf('color-mix(in oklch, var(--color-neutral-9) 22%, transparent)')
    )
  })
})
