import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'
import { Pane } from '../components/Pane'
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

const RAISED = 'var(--color-neutral-4)'
const FLOATING = `color-mix(in oklch, var(--color-neutral-9) 20%, ${RAISED})`
const ABOVE_FLOATING = `color-mix(in oklch, var(--color-neutral-9) 20%, ${FLOATING})`
const LIFTED_SUBTLE =
  'color-mix(in oklch, var(--color-neutral-12) 40%, var(--color-neutral-11))'

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

function textOf(colour: string) {
  const probe = document.createElement('span')
  probe.style.color = colour
  document.body.appendChild(probe)
  const resolved = getComputedStyle(probe).color
  probe.remove()
  return resolved
}

function subtleText(testId: string) {
  const probe = document.createElement('span')
  probe.className = 'text-subtle'
  screen.getByTestId(testId).appendChild(probe)
  const resolved = getComputedStyle(probe).color
  probe.remove()
  return resolved
}

const fill = (testId: string) =>
  getComputedStyle(screen.getByTestId(testId)).backgroundColor

function renderSurfaces() {
  render(
    <div>
      <div data-testid='raised' className='emphasis-raised'>
        <div data-testid='nested' className='emphasis-raised' />
      </div>
      <div data-testid='floating' className='emphasis-floating'>
        <div data-testid='in-floating' className='emphasis-raised' />
      </div>
      <div data-testid='page' />
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
  it('lifts a raised surface a step off the page', () => {
    document.documentElement.classList.add('dark')
    renderSurfaces()
    expect(fill('raised')).toBe(colourOf(RAISED))
  })

  it('lifts a floating surface above a raised one', () => {
    document.documentElement.classList.add('dark')
    renderSurfaces()
    expect(fill('floating')).toBe(colourOf(FLOATING))
  })

  it('keeps the lift under a translucent floating surface', () => {
    document.documentElement.classList.add('dark')
    renderSurfaces()
    expect(fill('translucent')).toBe(
      colourOf(`color-mix(in oklch, ${FLOATING} 88%, transparent)`)
    )
  })

  it('lifts a raised surface inside another one', () => {
    document.documentElement.classList.add('dark')
    renderSurfaces()
    expect(fill('nested')).toBe(colourOf(FLOATING))
  })

  it('lifts a raised surface inside a floating one above it', () => {
    document.documentElement.classList.add('dark')
    renderSurfaces()
    expect(fill('in-floating')).toBe(colourOf(ABOVE_FLOATING))
  })

  it('brightens subtle text on raised and floating surfaces', () => {
    document.documentElement.classList.add('dark')
    renderSurfaces()
    const lifted = textOf(LIFTED_SUBTLE)
    expect(subtleText('raised')).toBe(lifted)
    expect(subtleText('floating')).toBe(lifted)
    expect(subtleText('page')).toBe(textOf('var(--color-neutral-11)'))
  })

  it('lifts a floating surface in its own intent', () => {
    document.documentElement.classList.add('dark')
    renderSurfaces()
    expect(fill('brand-floating')).toBe(
      colourOf(
        'color-mix(in oklch, var(--color-brand-9) 20%, var(--color-brand-2))'
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
    expect(getComputedStyle(popup).backgroundColor).toBe(colourOf(FLOATING))
    expect(getComputedStyle(arrow).fill).toBe(colourOf(FLOATING))
  })
})

describe('a raised Pane in dark mode', () => {
  it('publishes the lifted fill it paints inside a floating surface', () => {
    document.documentElement.classList.add('dark')
    render(
      <div className='emphasis-floating'>
        <Pane aria-label='Tickets'>Body</Pane>
      </div>
    )
    const pane = screen.getByLabelText('Tickets')
    expect(
      colourOf(getComputedStyle(pane).getPropertyValue('--pane-surface'))
    ).toBe(getComputedStyle(pane).backgroundColor)
  })
})

function searchPane() {
  render(
    <Pane aria-label='Components'>
      <Pane.Header>
        <Pane.Search value='' onValueChange={() => {}} placeholder='Search' />
      </Pane.Header>
    </Pane>
  )
  return {
    pane: screen.getByLabelText('Components'),
    field: screen.getByRole('searchbox', { name: 'Search' })
  }
}

describe('a Pane search field', () => {
  it('sits raised on the light page', () => {
    const { field } = searchPane()
    expect(getComputedStyle(field).backgroundColor).toBe(
      colourOf('var(--color-neutral-1)')
    )
  })

  it('lifts off its raised Pane in dark mode', () => {
    document.documentElement.classList.add('dark')
    const { field } = searchPane()
    expect(getComputedStyle(field).backgroundColor).toBe(colourOf(FLOATING))
  })
})

describe('surfaces in light mode', () => {
  it('keeps raised, nested and floating surfaces on step 1', () => {
    renderSurfaces()
    const step1 = colourOf('var(--color-neutral-1)')
    expect(fill('raised')).toBe(step1)
    expect(fill('nested')).toBe(step1)
    expect(fill('floating')).toBe(step1)
    expect(fill('in-floating')).toBe(step1)
  })

  it('keeps subtle text on step 11 on a raised surface', () => {
    renderSurfaces()
    expect(subtleText('raised')).toBe(textOf('var(--color-neutral-11)'))
  })

  it('keeps the field’s light edge', () => {
    renderSurfaces()
    expect(getComputedStyle(screen.getByRole('textbox')).borderTopColor).toBe(
      edgeOf('color-mix(in oklch, var(--color-neutral-9) 22%, transparent)')
    )
  })
})
