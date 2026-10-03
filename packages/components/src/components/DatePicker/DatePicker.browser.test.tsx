import { useState } from 'react'

import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'

import { DatePicker } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { setHoverCapable, withFrames } from '../../css/testUtils'
import { Field } from '../Field'
import { useStylesheet } from '../Pane/testUtils'

const STILL = '*, *::before, *::after { transition: none !important }'
// Wed 7 Oct 2026.
const TODAY = '2026-10-07'

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
  cleanup()
  await commands.parkPointer()
})

const focusedDate = () => (document.activeElement as HTMLElement).dataset.date
// Calendar's own live region is also a status while the popup animates out.
const shown = () => document.querySelector('output')!
const trigger = () => screen.getByRole('button', { name: /^Choose date/ })
const day = (date: string) =>
  document.querySelector<HTMLButtonElement>(
    `[data-slot="calendar"] button[data-date="${date}"]:not([data-outside])`
  )!

function ShowDate({ initial = '2026-10-23' }: { initial?: string | null }) {
  const [value, setValue] = useState<string | null>(initial)
  return (
    <div className='grid gap-2 p-4'>
      <Field>
        <Field.Label>Show date</Field.Label>
        <DatePicker today={TODAY} value={value} onValueChange={setValue} />
        <Field.ErrorText />
      </Field>
      <output>{value ?? 'none'}</output>
    </div>
  )
}

describe('DatePicker by keyboard', () => {
  it('opens on the chosen day with focus on it', async () => {
    render(<ShowDate />)
    await userEvent.click(trigger())
    await expect.poll(focusedDate).toBe('2026-10-23')
  })

  it('opens on today when nothing is chosen', async () => {
    render(<ShowDate initial={null} />)
    await userEvent.click(trigger())
    await expect.poll(focusedDate).toBe(TODAY)
  })

  it('tabs from the typed field to the button, committing on the way', async () => {
    render(<ShowDate initial={null} />)
    await userEvent.click(screen.getByRole('combobox', { name: 'Show date' }))
    await userEvent.keyboard('14 mar')
    await userEvent.tab()
    expect(document.activeElement).toBe(trigger())
    expect(shown()).toHaveTextContent('2027-03-14')
  })

  it('chooses a day with the arrows and Enter, then hands focus back', async () => {
    render(<ShowDate />)
    trigger().focus()
    await userEvent.keyboard('{Enter}')
    await expect.poll(focusedDate).toBe('2026-10-23')
    await userEvent.keyboard('{ArrowRight}{ArrowDown}{Enter}')
    await expect
      .poll(() => trigger().getAttribute('aria-expanded'))
      .toBe('false')
    expect(shown()).toHaveTextContent('2026-10-31')
    expect(screen.getByRole('combobox', { name: 'Show date' })).toHaveValue(
      'Sat 31 Oct 2026'
    )
    await expect.poll(() => document.activeElement).toBe(trigger())
  })

  it('closes on Escape without changing the value', async () => {
    render(<ShowDate />)
    await userEvent.click(trigger())
    await expect.poll(focusedDate).toBe('2026-10-23')
    await userEvent.keyboard('{ArrowRight}{Escape}')
    await expect
      .poll(() => trigger().getAttribute('aria-expanded'))
      .toBe('false')
    expect(shown()).toHaveTextContent('2026-10-23')
    await expect.poll(() => document.activeElement).toBe(trigger())
  })

  it('reverts a draft on Escape', async () => {
    render(<ShowDate />)
    const input = screen.getByRole('combobox', { name: 'Show date' })
    await userEvent.clear(input)
    await userEvent.keyboard('someday{Escape}')
    expect(input).toHaveValue('Fri 23 Oct 2026')
  })
})

const TIMEOUT = { timeout: 15_000 }
const rect = (element: Element) => element.getBoundingClientRect()

describe('DatePicker on a phone', TIMEOUT, () => {
  afterAll(() => page.viewport(1920, 1080))

  it.each([
    [390, 844],
    [360, 740]
  ])(
    'opens a drawer at the foot of a %ipx screen with days a thumb can hit',
    async (width, height) => {
      await page.viewport(width, height)
      render(<ShowDate />)
      await userEvent.click(trigger())
      const drawer = await screen.findByRole('dialog', {
        name: 'Choose date, Show date'
      })
      expect(drawer).toHaveAttribute('data-slot', 'drawer-popup')
      await expect.poll(focusedDate).toBe('2026-10-23')
      await expect.poll(() => rect(drawer).bottom).toBe(window.innerHeight)
      expect(rect(drawer).left).toBe(0)
      expect(rect(drawer).right).toBe(window.innerWidth)
      expect(rect(screen.getByRole('grid')).right).toBeLessThanOrEqual(
        rect(drawer).right
      )
      expect(rect(day('2026-10-23')).width).toBeGreaterThanOrEqual(44)
      expect(rect(day('2026-10-23')).width).toBeLessThanOrEqual(48)
    }
  )

  it('chooses a tapped day and gives focus back to the button', async () => {
    await page.viewport(390, 844)
    setHoverCapable(false)
    render(<ShowDate />)
    await userEvent.click(trigger())
    await screen.findByRole('dialog')
    await userEvent.click(day('2026-10-29'))
    await withFrames(() =>
      expect.poll(() => screen.queryByRole('dialog')).toBeNull()
    )
    expect(shown()).toHaveTextContent('2026-10-29')
    // Focus on the text field would raise the on-screen keyboard.
    await expect.poll(() => document.activeElement).toBe(trigger())
  })

  it('closes on Escape without a change', async () => {
    await page.viewport(390, 844)
    render(<ShowDate />)
    await userEvent.click(trigger())
    await screen.findByRole('dialog')
    await expect.poll(focusedDate).toBe('2026-10-23')
    await userEvent.keyboard('{ArrowRight}{Escape}')
    await withFrames(() =>
      expect.poll(() => screen.queryByRole('dialog')).toBeNull()
    )
    expect(shown()).toHaveTextContent('2026-10-23')
    await expect.poll(() => document.activeElement).toBe(trigger())
  })
})

describe('DatePicker from the phone breakpoint up', TIMEOUT, () => {
  afterAll(() => page.viewport(1920, 1080))

  it('opens a popover under the field with 40px days', async () => {
    await page.viewport(768, 1024)
    render(<ShowDate />)
    await userEvent.click(trigger())
    const popup = await screen.findByRole('dialog')
    expect(popup).toHaveAttribute('data-slot', 'popover-popup')
    const field = document.querySelector('[data-slot="date-picker-group"]')!
    expect(rect(popup).top).toBeGreaterThan(rect(field).bottom)
    // Measured once the popover has finished scaling in.
    await expect.poll(() => rect(day('2026-10-23')).width).toBe(40)
  })
})

describe('DatePicker field', () => {
  it('dims once when disabled', () => {
    render(<DatePicker aria-label='Show date' disabled />)
    let opacity = 1
    for (let node: Element | null = trigger(); node; node = node.parentElement)
      opacity *= Number(getComputedStyle(node).opacity)
    expect(opacity).toBeCloseTo(0.5)
  })

  it('takes the field’s accent ring when its text has focus', async () => {
    render(<ShowDate />)
    const group = document.querySelector<HTMLElement>(
      '[data-slot="date-picker-group"]'
    )!
    const resting = getComputedStyle(group).borderColor
    await userEvent.click(screen.getByRole('combobox', { name: 'Show date' }))
    await expect
      .poll(() => getComputedStyle(group).borderColor)
      .not.toBe(resting)
  })

  it('turns danger when typed text names no date', async () => {
    render(<ShowDate />)
    const group = document.querySelector<HTMLElement>(
      '[data-slot="date-picker-group"]'
    )!
    const input = screen.getByRole('combobox', { name: 'Show date' })
    await userEvent.click(input)
    const focusedBorder = getComputedStyle(group).borderColor
    await userEvent.clear(input)
    await userEvent.keyboard('someday{Enter}')
    await expect
      .poll(() => getComputedStyle(group).borderColor)
      .not.toBe(focusedBorder)
    // Field.ErrorText hears of the error a render later.
    await expect.poll(() => screen.queryByRole('alert')).not.toBeNull()
  })
})

describe('DatePicker suggestions on a phone', () => {
  beforeAll(() => page.viewport(390, 844))
  afterAll(() => page.viewport(1920, 1080))

  it('hints under the field, on screen, and takes a tapped hint', async () => {
    setHoverCapable(false)
    render(<ShowDate initial={null} />)
    const input = screen.getByRole('combobox', { name: 'Show date' })
    await userEvent.click(input)
    const list = await screen.findByRole('listbox')
    const group = input.closest('[data-slot="date-picker-group"]')!
    const listBox = list
      .closest('[data-slot="autocomplete-popup"]')!
      .getBoundingClientRect()
    const groupBox = group.getBoundingClientRect()
    expect(listBox.top).toBeGreaterThanOrEqual(groupBox.bottom)
    expect(Math.round(listBox.left)).toBe(Math.round(groupBox.left))
    expect(listBox.right).toBeLessThanOrEqual(window.innerWidth)
    expect(
      screen
        .getAllByRole('option')
        .every((o) => !o.hasAttribute('data-highlighted'))
    ).toBe(true)
    await userEvent.click(screen.getByRole('option', { name: /^Tomorrow/ }))
    await expect.poll(() => shown().textContent).toBe('2026-10-08')
    expect(input).toHaveValue('Thu 8 Oct 2026')
  })

  it('takes the first suggestion on Enter once typing starts', async () => {
    render(<ShowDate initial={null} />)
    const input = screen.getByRole('combobox', { name: 'Show date' })
    await userEvent.click(input)
    await userEvent.type(input, 'end of m')
    await expect
      .poll(() => screen.queryByRole('option', { name: /^End of month/ }))
      .toHaveAttribute('data-highlighted')
    await userEvent.keyboard('{Enter}')
    await expect.poll(() => shown().textContent).toBe('2026-10-31')
  })
})
