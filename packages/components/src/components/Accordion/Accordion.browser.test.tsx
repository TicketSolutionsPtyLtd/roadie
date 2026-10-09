import { createRef } from 'react'

import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Accordion } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())

const nextFrame = () =>
  new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

// Safari lacks interpolate-size, so the item measures its own content.
describe('an Accordion without interpolate-size', () => {
  const supports = CSS.supports
  beforeAll(() => {
    CSS.supports = () => false
  })
  afterAll(() => {
    CSS.supports = supports
  })
  afterEach(() => cleanup())

  function Item({
    height,
    open = true,
    ref
  }: {
    height: number
    open?: boolean
    ref?: React.Ref<HTMLDetailsElement>
  }) {
    return (
      <Accordion>
        <Accordion.Item ref={ref} open={open}>
          <Accordion.Trigger>Trigger</Accordion.Trigger>
          <Accordion.Content>
            <div style={{ height }} />
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    )
  }

  const details = () => document.querySelector('details')!
  const contentHeight = () =>
    details().style.getPropertyValue('--content-height')
  const measured = () =>
    `${document.querySelector<HTMLElement>('[data-slot="accordion-content"]')!.scrollHeight}px`

  it('keeps --content-height current while an open panel changes size', async () => {
    const { rerender } = render(<Item height={120} />)
    await expect.poll(contentHeight).toBe(measured())
    const before = contentHeight()

    rerender(<Item height={240} />)
    await expect.poll(contentHeight).not.toBe(before)
    expect(contentHeight()).toBe(measured())
  })

  it('keeps --content-height current when a consumer passes a ref', async () => {
    const ref = createRef<HTMLDetailsElement>()
    const { rerender } = render(<Item ref={ref} height={120} />)
    await expect.poll(contentHeight).toBe(measured())
    const before = contentHeight()

    rerender(<Item ref={ref} height={240} />)
    await expect.poll(contentHeight).not.toBe(before)
    expect(ref.current).toBe(details())
  })

  it('keeps the last height while closed so it can animate back open', async () => {
    const { rerender } = render(<Item height={120} />)
    await expect.poll(contentHeight).toBe(measured())
    const open = contentHeight()

    rerender(<Item height={120} open={false} />)
    rerender(<Item height={240} open={false} />)
    await nextFrame()
    await nextFrame()
    expect(contentHeight()).toBe(open)
  })
})
