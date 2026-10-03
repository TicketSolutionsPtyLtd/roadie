import { useState } from 'react'

import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'

import { DatePicker } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { setHoverCapable } from '../../css/testUtils'
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
const trigger = () => screen.getByRole('button', { name: 'Choose date' })
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
    await userEvent.click(screen.getByLabelText('Show date'))
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
    expect(screen.getByLabelText('Show date')).toHaveValue('Sat 31 Oct 2026')
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
    const input = screen.getByLabelText('Show date')
    await userEvent.clear(input)
    await userEvent.keyboard('someday{Escape}')
    expect(input).toHaveValue('Fri 23 Oct 2026')
  })
})

describe('DatePicker on a phone', () => {
  afterAll(() => page.viewport(1920, 1080))

  it('keeps the calendar inside a 390px screen', async () => {
    await page.viewport(390, 844)
    render(<ShowDate />)
    await userEvent.click(trigger())
    const popup = await screen.findByRole('dialog')
    await expect.poll(focusedDate).toBe('2026-10-23')
    const box = popup.getBoundingClientRect()
    expect(box.left).toBeGreaterThanOrEqual(0)
    expect(box.right).toBeLessThanOrEqual(window.innerWidth)
    const grid = screen.getByRole('grid').getBoundingClientRect()
    expect(grid.right).toBeLessThanOrEqual(box.right)
  })

  it('chooses a tapped day and leaves focus off the text field', async () => {
    await page.viewport(390, 844)
    setHoverCapable(false)
    render(<ShowDate />)
    await userEvent.click(trigger())
    await screen.findByRole('dialog')
    await userEvent.click(day('2026-10-29'))
    await expect
      .poll(() => trigger().getAttribute('aria-expanded'))
      .toBe('false')
    expect(shown()).toHaveTextContent('2026-10-29')
    // Focus on the text field would raise the on-screen keyboard.
    expect(document.activeElement).not.toBe(screen.getByLabelText('Show date'))
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
    await userEvent.click(screen.getByLabelText('Show date'))
    await expect
      .poll(() => getComputedStyle(group).borderColor)
      .not.toBe(resting)
  })

  it('turns danger when typed text names no date', async () => {
    render(<ShowDate />)
    const group = document.querySelector<HTMLElement>(
      '[data-slot="date-picker-group"]'
    )!
    const input = screen.getByLabelText('Show date')
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
