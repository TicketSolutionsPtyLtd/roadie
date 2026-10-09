import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Steps, type StepsProps } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

function renderCheckout({ direction }: Pick<StepsProps, 'direction'>) {
  const { container } = render(
    <div style={{ width: 600 }}>
      <Steps count={2} direction={direction}>
        <Steps.List>
          <Steps.Item index={0}>
            <Steps.Trigger>
              <Steps.Indicator>1</Steps.Indicator>
              Tickets
            </Steps.Trigger>
            <Steps.Separator />
          </Steps.Item>
          <Steps.Item index={1}>
            <Steps.Trigger>
              <Steps.Indicator>2</Steps.Indicator>
              Payment
            </Steps.Trigger>
          </Steps.Item>
        </Steps.List>
        <Steps.Content index={0}>Pick your tickets</Steps.Content>
      </Steps>
    </div>
  )
  const step = (name: string) =>
    screen
      .getByText(name)
      .closest('[data-slot="steps-item"]')!
      .getBoundingClientRect()
  return {
    list: container
      .querySelector('[data-slot="steps-list"]')!
      .getBoundingClientRect(),
    content: screen.getByText('Pick your tickets').getBoundingClientRect(),
    tickets: step('Tickets'),
    payment: step('Payment')
  }
}

describe('Steps direction', () => {
  it('runs the steps across, above the content, by default', () => {
    const { list, content, tickets, payment } = renderCheckout({})
    expect(payment.left).toBeGreaterThanOrEqual(tickets.right)
    expect(content.top).toBeGreaterThanOrEqual(list.bottom)
  })

  it('stacks the steps beside the content when vertical', () => {
    const { list, content, tickets, payment } = renderCheckout({
      direction: 'vertical'
    })
    expect(payment.top).toBeGreaterThanOrEqual(tickets.bottom)
    expect(content.left).toBeGreaterThanOrEqual(list.right)
  })
})
