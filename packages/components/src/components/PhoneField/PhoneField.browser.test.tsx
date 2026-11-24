import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { PhoneField, type PhoneFieldProps } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Field } from '../Field'
import { useStylesheet } from '../Pane/testUtils'

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
afterEach(() => cleanup())

function mount(props: PhoneFieldProps = {}, width = 320) {
  render(
    <div className='grid gap-4 p-4' style={{ width }}>
      <button type='button'>Before</button>
      <Field>
        <Field.Label>Mobile number</Field.Label>
        <PhoneField {...props} />
      </Field>
    </div>
  )
  const number = screen.getByRole('textbox', { name: 'Mobile number' })
  const picker = screen.getByRole('combobox', { name: /\+\d+$/ })
  const group = number.closest<HTMLElement>('[data-slot="phone-field"]')!
  return { number, picker, group }
}

const options = () => screen.queryAllByRole('option')
const search = () => screen.findByRole('combobox', { name: 'Search countries' })
const ringWidth = (element: HTMLElement) => {
  const { outlineStyle, outlineWidth } = getComputedStyle(element)
  return outlineStyle === 'none' ? 0 : parseFloat(outlineWidth)
}

describe('PhoneField layout', () => {
  it.each([
    ['sm', 32],
    ['md', 40],
    ['lg', 48]
  ] as const)('stands %s at %ipx, as Input does', (size, height) => {
    const { group } = mount({ size })
    expect(group.getBoundingClientRect().height).toBe(height)
  })

  it('fits both controls in a 320px column', () => {
    const { group, picker, number } = mount({ defaultValue: '+61412345678' })
    const box = group.getBoundingClientRect()

    expect(group.scrollWidth).toBeLessThanOrEqual(group.clientWidth)
    expect(picker.getBoundingClientRect().left).toBeGreaterThanOrEqual(box.left)
    expect(number.getBoundingClientRect().right).toBeLessThanOrEqual(box.right)
    expect(number.getBoundingClientRect().width).toBeGreaterThan(120)
    expect(number.scrollWidth).toBeLessThanOrEqual(number.clientWidth)
  })

  it('draws one ring around both controls while the number has focus', async ({
    skip
  }) => {
    const { group, number, picker } = mount()
    screen.getByRole('button', { name: 'Before' }).focus()
    await userEvent.keyboard('{Tab}{Tab}')
    // Firefox gives one test frame document focus when files run in parallel.
    if (!document.hasFocus()) skip('the test frame has no document focus')

    expect(document.activeElement).toBe(number)
    expect(ringWidth(group)).toBeGreaterThan(0)
    expect(ringWidth(number)).toBe(0)
    expect(picker.getBoundingClientRect().height).toBeLessThanOrEqual(
      group.getBoundingClientRect().height
    )
  })
})

describe('PhoneField picker', () => {
  it('lists every country by name, drawing only the rows in view', async () => {
    const { picker } = mount()
    await userEvent.click(picker)

    await expect.poll(() => options().length).toBeGreaterThan(0)
    expect(options().length).toBeLessThan(60)
    expect(Number(options()[0]?.getAttribute('aria-setsize'))).toBeGreaterThan(
      230
    )
  })

  it('opens on the chosen country', async () => {
    const { picker } = mount({ defaultCountry: 'NZ' })
    await userEvent.click(picker)

    await expect
      .poll(() => screen.queryByRole('option', { name: /New Zealand/ }))
      .toBeVisible()
  })

  it('finds a country in the whole list by typing, and picks it with Enter', async () => {
    const { picker, number } = mount()
    await userEvent.click(picker)
    await userEvent.type(await search(), 'new zea')
    await expect
      .poll(() => options().map((option) => option.textContent))
      .toEqual([expect.stringContaining('New Zealand')])

    await userEvent.keyboard('{Enter}')

    await expect
      .poll(() => picker.getAttribute('aria-label'))
      .toBe('Country code: New Zealand +64')
    expect(number).toHaveValue('')
    await expect.poll(() => options()).toHaveLength(0)
  })

  it('starts each search afresh', async () => {
    const { picker } = mount()
    await userEvent.click(picker)
    await userEvent.type(await search(), 'new zea')
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => options()).toHaveLength(0)

    await userEvent.click(picker)

    expect(await search()).toHaveValue('')
  })

  it('keeps the popup on screen in a 320px column', async () => {
    const { picker } = mount()
    await userEvent.click(picker)
    await expect.poll(() => options().length).toBeGreaterThan(0)

    const popup = document
      .querySelector('[data-slot="combobox-popup"]')!
      .getBoundingClientRect()
    expect(popup.left).toBeGreaterThanOrEqual(0)
    expect(popup.right).toBeLessThanOrEqual(window.innerWidth)
  })

  it('returns focus to the picker when Escape closes it', async ({ skip }) => {
    const { picker } = mount()
    await userEvent.click(picker)
    await search()
    if (!document.hasFocus()) skip('the test frame has no document focus')
    await userEvent.keyboard('{Escape}')

    await expect.poll(() => document.activeElement).toBe(picker)
  })
})
