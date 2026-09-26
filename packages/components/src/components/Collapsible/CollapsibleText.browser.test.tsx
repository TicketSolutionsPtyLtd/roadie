import { act, cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Collapsible } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const DETAILS = Array.from(
  { length: 6 },
  () =>
    'General admission to Harbour Moth at the Paper Lantern Hall in Fitzroy, standing only, with a free drink on arrival.'
).join(' ')

const WIDTHS = [390, 960]

function setup(width: number, props: { dir?: 'rtl'; text?: string } = {}) {
  const { container } = render(
    <div dir={props.dir} style={{ width }}>
      <Collapsible>
        <Collapsible.Text lines={3}>{props.text ?? DETAILS}</Collapsible.Text>
      </Collapsible>
    </div>
  )
  const root = container.querySelector<HTMLElement>(
    '[data-slot=collapsible-text]'
  )!
  const content = container.querySelector<HTMLElement>(
    '[data-slot=collapsible-text-content]'
  )!
  const trigger = () =>
    container.querySelector<HTMLElement>('[data-slot=collapsible-text-trigger]')
  const lineHeight = parseFloat(getComputedStyle(content).lineHeight)
  return { root, content, trigger, lineHeight }
}

describe('Collapsible.Text', () => {
  for (const width of WIDTHS) {
    it(`clamps to three lines with …more on the last line at ${width}px`, async () => {
      const { root, content, trigger, lineHeight } = setup(width)
      await expect.poll(trigger).not.toBeNull()

      const box = content.getBoundingClientRect()
      expect(Math.abs(box.height - lineHeight * 3)).toBeLessThanOrEqual(1)
      expect(getComputedStyle(content).maskImage).not.toBe('none')

      const button = trigger()!.getBoundingClientRect()
      expect(Math.abs(button.bottom - box.bottom)).toBeLessThanOrEqual(1)
      expect(button.top).toBeGreaterThanOrEqual(box.bottom - lineHeight - 1)
      expect(
        Math.abs(button.right - root.getBoundingClientRect().right)
      ).toBeLessThanOrEqual(1)
    })

    it(`expands to the full text at ${width}px`, async () => {
      const { content, trigger, lineHeight } = setup(width)
      await expect.poll(trigger).not.toBeNull()

      act(() => trigger()!.click())
      await expect.poll(() => content.style.height).toBe('')

      const full = content.scrollHeight
      expect(full).toBeGreaterThan(lineHeight * 3 + 1)
      expect(
        Math.abs(content.getBoundingClientRect().height - full)
      ).toBeLessThanOrEqual(1)
      expect(getComputedStyle(content).maskImage).toBe('none')
      expect(trigger()).toHaveTextContent('Show less')
      expect(trigger()!.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        content.getBoundingClientRect().bottom - 1
      )
    })
  }

  it('shows no trigger or fade for text that fits', async () => {
    const { content, trigger } = setup(960, { text: 'Standing only.' })
    await new Promise((resolve) => requestAnimationFrame(resolve))
    expect(trigger()).toBeNull()
    expect(getComputedStyle(content).maskImage).toBe('none')
  })

  it('puts …more at the start edge in right-to-left text', async () => {
    const { root, trigger } = setup(390, { dir: 'rtl' })
    await expect.poll(trigger).not.toBeNull()
    expect(
      Math.abs(
        trigger()!.getBoundingClientRect().left -
          root.getBoundingClientRect().left
      )
    ).toBeLessThanOrEqual(1)
  })
})
