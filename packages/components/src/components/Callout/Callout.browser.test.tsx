import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Callout } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

function renderCallout(width: number) {
  const { container } = render(
    <div style={{ width }}>
      <Callout intent='warning' onDismiss={() => {}}>
        <Callout.Icon />
        <Callout.Title>Presale ends tonight</Callout.Title>
        <Callout.Description>
          Tickets go on general sale at 9am.
        </Callout.Description>
        <Callout.Actions>
          <button type='button'>Buy now</button>
        </Callout.Actions>
      </Callout>
    </div>
  )
  const box = (slot: string) =>
    container
      .querySelector<HTMLElement>(`[data-slot=${slot}]`)!
      .getBoundingClientRect()
  return {
    title: box('callout-title'),
    description: box('callout-description'),
    actions: box('callout-actions'),
    dismiss: box('callout-dismiss')
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
