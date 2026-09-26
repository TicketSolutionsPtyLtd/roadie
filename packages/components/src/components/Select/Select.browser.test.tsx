import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Select } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { setHoverCapable } from '../../css/testUtils'
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
afterEach(() => {
  setHoverCapable(true)
  cleanup()
})

const fill = (element: Element) => getComputedStyle(element).backgroundColor

async function tapJazz() {
  render(
    // @ts-expect-error Roadie's Select types don't take `multiple` yet
    <Select multiple>
      <Select.Trigger aria-label='Genres'>
        <Select.Value placeholder='Pick genres' />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value='rock'>Rock</Select.Item>
        <Select.Item value='jazz'>Jazz</Select.Item>
      </Select.Content>
    </Select>
  )
  await userEvent.click(screen.getByRole('combobox', { name: 'Genres' }))
  const tapped = await screen.findByRole('option', { name: 'Jazz' })
  const resting = screen.getByRole('option', { name: 'Rock' })
  await userEvent.click(tapped)
  await expect.poll(() => tapped.getAttribute('aria-selected')).toBe('true')
  expect(tapped).toHaveAttribute('data-highlighted')
  return { resting, tapped }
}

describe('Select options on a touch screen', () => {
  it('drop the highlight once a tapped option leaves the list open', async () => {
    setHoverCapable(false)
    const { resting, tapped } = await tapJazz()

    expect(fill(tapped)).toBe(fill(resting))
  })

  it('still highlight under a pointer that can hover', async () => {
    setHoverCapable(true)
    const { resting, tapped } = await tapJazz()

    expect(fill(tapped)).not.toBe(fill(resting))
  })

  it('still highlight the option a keyboard moves to', async () => {
    setHoverCapable(false)
    render(
      <Select>
        <Select.Trigger aria-label='Genre'>
          <Select.Value placeholder='Pick a genre' />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value='rock'>Rock</Select.Item>
          <Select.Item value='jazz'>Jazz</Select.Item>
        </Select.Content>
      </Select>
    )
    await userEvent.tab()
    await userEvent.keyboard('{ArrowDown}')
    const first = await screen.findByRole('option', { name: 'Rock' })
    const second = screen.getByRole('option', { name: 'Jazz' })
    await expect.poll(() => document.activeElement).toBe(first)
    await userEvent.keyboard('{ArrowDown}')
    await expect.poll(() => document.activeElement).toBe(second)

    expect(fill(second)).not.toBe(fill(first))
  })
})
