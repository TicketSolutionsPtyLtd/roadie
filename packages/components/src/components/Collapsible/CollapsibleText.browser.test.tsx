import { type ReactNode, useState } from 'react'

import { act, cleanup, render, screen } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { userEvent } from 'vitest/browser'

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
    'General admission to Harbour Moth at Iguana Teapot Hall in Fitzroy, standing only, with a free drink on arrival.'
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

  it('shows no trigger or fade once the text fits', async () => {
    const sentence =
      'General admission to Harbour Moth at Iguana Teapot Hall in Fitzroy.'
    const { root, content, trigger } = setup(120, { text: sentence })
    // The trigger appearing proves the text is measured, so its absence
    // after the resize is a result, not a check that ran too early.
    await expect.poll(trigger).not.toBeNull()

    root.parentElement!.style.width = '960px'
    await expect.poll(trigger).toBeNull()
    expect(content).not.toHaveAttribute('data-overflowing')
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

describe('Collapsible.Text overflowing', () => {
  const content = () =>
    document.querySelector<HTMLElement>('[data-slot=collapsible-text-content]')!

  function Narrow({ children }: { children: ReactNode }) {
    return <div style={{ width: 390 }}>{children}</div>
  }

  it('shows an inline …more trigger that controls the text', async () => {
    render(
      <Narrow>
        <Collapsible>
          <Collapsible.Text>{DETAILS}</Collapsible.Text>
        </Collapsible>
      </Narrow>
    )
    const trigger = await screen.findByRole('button', { name: 'more' })
    expect(trigger).toHaveTextContent('…more')
    expect(trigger.querySelector('[aria-hidden="true"]')).toHaveTextContent('…')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('aria-controls', content().id)
    expect(content()).toHaveAttribute('data-overflowing')
  })

  it('expands and collapses, keeping focus on the trigger', async () => {
    render(
      <Narrow>
        <Collapsible>
          <Collapsible.Text>{DETAILS}</Collapsible.Text>
        </Collapsible>
      </Narrow>
    )
    const trigger = await screen.findByRole('button', { name: 'more' })

    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAccessibleName('Show less')
    expect(trigger).toHaveFocus()
    expect(content()).not.toHaveAttribute('data-clamped')

    await userEvent.keyboard('{Enter}')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAccessibleName('more')
    expect(trigger).toHaveFocus()
    expect(content()).toHaveAttribute('data-clamped')
  })

  it('takes custom labels', async () => {
    render(
      <Narrow>
        <Collapsible>
          <Collapsible.Text moreLabel='details' lessLabel='Hide details'>
            {DETAILS}
          </Collapsible.Text>
        </Collapsible>
      </Narrow>
    )
    await userEvent.click(
      await screen.findByRole('button', { name: 'details' })
    )
    expect(screen.getByRole('button')).toHaveAccessibleName('Hide details')
  })

  it('only expands with lessLabel={null}, moving focus to the text', async () => {
    render(
      <Narrow>
        <Collapsible>
          <Collapsible.Text lessLabel={null}>{DETAILS}</Collapsible.Text>
        </Collapsible>
      </Narrow>
    )
    await userEvent.click(await screen.findByRole('button', { name: 'more' }))
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(content()).not.toHaveAttribute('data-clamped')
    expect(content()).toHaveFocus()
  })

  it('can be controlled', async () => {
    const onOpenChange = vi.fn()
    function Controlled() {
      const [open, setOpen] = useState(false)
      return (
        <Narrow>
          <Collapsible
            open={open}
            onOpenChange={(next) => {
              onOpenChange(next)
              setOpen(next)
            }}
          >
            <Collapsible.Text>{DETAILS}</Collapsible.Text>
          </Collapsible>
        </Narrow>
      )
    }
    render(<Controlled />)
    await userEvent.click(await screen.findByRole('button'))
    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')
  })

  it('starts open with defaultOpen', async () => {
    render(
      <Narrow>
        <Collapsible defaultOpen>
          <Collapsible.Text>{DETAILS}</Collapsible.Text>
        </Collapsible>
      </Narrow>
    )
    expect(
      await screen.findByRole('button', { name: 'Show less' })
    ).toBeVisible()
    expect(content()).not.toHaveAttribute('data-clamped')
  })

  it('leaves focus alone when something else opens it', async () => {
    function Opener() {
      const [open, setOpen] = useState(false)
      return (
        <Narrow>
          <button type='button' onClick={() => setOpen(true)}>
            Open
          </button>
          <Collapsible open={open}>
            <Collapsible.Text lessLabel={null}>{DETAILS}</Collapsible.Text>
          </Collapsible>
        </Narrow>
      )
    }
    render(<Opener />)
    await screen.findByRole('button', { name: 'more' })
    const opener = screen.getByRole('button', { name: 'Open' })
    // WebKit doesn't focus a button on click.
    opener.focus()
    await userEvent.keyboard('{Enter}')
    expect(content()).not.toHaveAttribute('data-clamped')
    expect(opener).toHaveFocus()
  })
})
