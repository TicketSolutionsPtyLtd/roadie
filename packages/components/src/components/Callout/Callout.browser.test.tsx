import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Callout } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { setHoverCapable } from '../../css/testUtils'
import { Button } from '../Button'
import { useStylesheet } from '../Pane/testUtils'
import type { CalloutEmphasis } from './variants'

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
afterEach(async () => {
  setHoverCapable(true)
  await userEvent.unhover(document.body)
  cleanup()
})

const frame = () =>
  new Promise((resolve) => requestAnimationFrame(() => resolve(null)))

function renderCallout(width: number, emphasis?: CalloutEmphasis) {
  const { container } = render(
    <div style={{ width }}>
      <Callout intent='warning' emphasis={emphasis} onDismiss={() => {}}>
        <Callout.Icon />
        <Callout.Title>Presale ends tonight</Callout.Title>
        <Callout.Description>
          Tickets go on general sale at 9am.
        </Callout.Description>
        <Callout.Actions>
          <Button size='sm'>Buy now</Button>
        </Callout.Actions>
      </Callout>
    </div>
  )
  const part = (slot: string) =>
    container.querySelector<HTMLElement>(`[data-slot=${slot}]`)!
  const box = (slot: string) => part(slot).getBoundingClientRect()
  return {
    title: box('callout-title'),
    description: box('callout-description'),
    actions: box('callout-actions'),
    dismiss: box('callout-dismiss'),
    dismissButton: part('callout-dismiss'),
    actionButton: part('callout-actions').querySelector('button')!
  }
}

describe('Callout actions', () => {
  it('sit below the text in a narrow callout', () => {
    const { description, actions, dismiss } = renderCallout(360)
    expect(actions.top).toBeGreaterThanOrEqual(description.bottom)
    expect(actions.left).toBeCloseTo(description.left, 0)
    expect(dismiss.left).toBeGreaterThanOrEqual(description.right)
  })

  it('sit beside the text in a wide callout', () => {
    const { title, description, actions, dismiss } = renderCallout(720)
    expect(actions.left).toBeGreaterThanOrEqual(description.right)
    expect(actions.top).toBeLessThan(description.bottom)
    expect(actions.bottom).toBeGreaterThan(title.top)
    expect(dismiss.left).toBeGreaterThanOrEqual(actions.right)
  })
})

const look = (element: HTMLElement) => {
  const style = getComputedStyle(element)
  return {
    background: style.backgroundColor,
    border: style.borderColor,
    shadow: style.boxShadow
  }
}

describe.each(['subtle', 'strong'] as const)(
  'Callout buttons, %s emphasis',
  (emphasis) => {
    it.each(['dismissButton', 'actionButton'] as const)(
      'the %s keeps its resting look after a tap on a touch screen',
      async (name) => {
        setHoverCapable(false)
        const button = renderCallout(360, emphasis)[name]
        await frame()
        const rest = look(button)

        await userEvent.hover(button)
        await frame()

        expect(button.matches(':hover')).toBe(true)
        expect(look(button)).toEqual(rest)
      }
    )

    it.each(['dismissButton', 'actionButton'] as const)(
      'the %s changes on hover where a pointer can hover',
      async (name) => {
        setHoverCapable(true)
        const button = renderCallout(360, emphasis)[name]
        await frame()
        const rest = look(button)

        await userEvent.hover(button)
        await frame()

        expect(look(button)).not.toEqual(rest)
      }
    )
  }
)
