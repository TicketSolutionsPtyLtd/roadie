import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'

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

describe('PhoneField states', () => {
  const edge = (element: HTMLElement) => getComputedStyle(element).borderColor

  it('draws the ring around both controls while the picker has focus', async ({
    skip
  }) => {
    const { group, picker } = mount()
    screen.getByRole('button', { name: 'Before' }).focus()
    await userEvent.keyboard('{Tab}')
    if (!document.hasFocus()) skip('the test frame has no document focus')

    expect(document.activeElement).toBe(picker)
    expect(ringWidth(group)).toBeGreaterThan(0)
  })

  it('takes the danger outline when its Field is invalid', () => {
    const { group: plain } = mount()
    const rest = edge(plain)
    cleanup()
    render(
      <Field invalid>
        <Field.Label>Mobile number</Field.Label>
        <PhoneField />
      </Field>
    )
    const group = screen.getByRole('group', { name: 'Mobile number' })

    expect(edge(group)).not.toBe(rest)
  })

  it('dims a disabled field once, not the picker twice', () => {
    const { group, picker } = mount({ disabled: true })

    expect(getComputedStyle(group).opacity).toBe('0.5')
    expect(getComputedStyle(picker).opacity).toBe('1')
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

  it("lines up every dial code, with room for the chosen country's check", async () => {
    const { picker } = mount({
      defaultCountry: 'NZ',
      countries: ['AU', 'NZ', 'GB', 'US']
    })
    await userEvent.click(picker)
    await expect.poll(() => options().length).toBe(4)

    const dialCodes = options().map(
      (option) =>
        [...option.querySelectorAll('span')]
          .find((span) => span.textContent?.startsWith('+'))!
          .getBoundingClientRect().right
    )
    expect(new Set(dialCodes.map(Math.round)).size).toBe(1)
    const check = screen
      .getByRole('option', { name: /New Zealand/ })
      .querySelector('svg')!
      .getBoundingClientRect()
    expect(check.left).toBeGreaterThan(dialCodes[0]!)
  })

  it('keeps the popup on a 320px screen', async () => {
    await page.viewport(320, 568)
    try {
      const { picker } = mount()
      await userEvent.click(picker)
      await expect.poll(() => options().length).toBeGreaterThan(0)

      const popup = document
        .querySelector('[data-slot="combobox-popup"]')!
        .getBoundingClientRect()
      expect(popup.left).toBeGreaterThanOrEqual(0)
      expect(popup.right).toBeLessThanOrEqual(320)
      expect(popup.top).toBeGreaterThanOrEqual(0)
      expect(popup.bottom).toBeLessThanOrEqual(568)
    } finally {
      await page.viewport(1920, 1080)
    }
  })

  it.each([
    [15, false],
    [16, true]
  ])('draws %i countries with windowing %s', async (count, windowed) => {
    const codes = ['AU', 'NZ', 'GB', 'US', 'IE', 'SG', 'CA', 'FR', 'DE', 'IT']
      .concat(['ES', 'JP', 'KR', 'ID', 'IN', 'BR'])
      .slice(0, count)
    const { picker } = mount({ countries: codes })
    await userEvent.click(picker)

    await expect.poll(() => options().length).toBeGreaterThan(0)
    expect(options()[0]?.hasAttribute('aria-setsize')).toBe(windowed)
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
