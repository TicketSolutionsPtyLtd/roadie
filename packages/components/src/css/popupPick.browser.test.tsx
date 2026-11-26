import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import roadieCss from '../../vitest.browser.css?inline'
import { Menu } from '../components/Menu'
import { useStylesheet } from '../components/Pane/testUtils'
import { Select } from '../components/Select'
import { pickMenuItem, pickOption } from './testUtils'

beforeAll(() => useStylesheet(roadieCss))
afterEach(() => {
  vi.restoreAllMocks()
  cleanup()
})

// Stands in for Linux WebKit, which runs no frames while idle: macOS and
// Chromium keep running them, so the race needs frames held back.
function slowFrames() {
  const frame = window.requestAnimationFrame.bind(window)
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    window.setTimeout(() => frame(callback), 400)
    return 0
  })
}

describe(
  'pickOption and pickMenuItem with slow frames',
  { timeout: 20_000 },
  () => {
    it('picks twice in a row from the same Select', async () => {
      const onValueChange = vi.fn()
      render(
        <Select onValueChange={onValueChange}>
          <Select.Trigger aria-label='City'>
            <Select.Value placeholder='Pick a city' />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value='melbourne'>Melbourne</Select.Item>
            <Select.Item value='brisbane'>Brisbane</Select.Item>
          </Select.Content>
        </Select>
      )
      const user = userEvent.setup()
      slowFrames()
      const from = screen.getByRole('combobox', { name: 'City' })
      await pickOption(user, { from, option: 'Melbourne' })
      await pickOption(user, { from, option: 'Brisbane' })
      expect(onValueChange.mock.calls.map(([value]) => value)).toEqual([
        'melbourne',
        'brisbane'
      ])
    })

    it('picks twice in a row from the same menu', async () => {
      const onClick = vi.fn()
      render(
        <Menu>
          <Menu.Trigger>Show</Menu.Trigger>
          <Menu.Content>
            <Menu.Item onClick={() => onClick('edit')}>Edit</Menu.Item>
            <Menu.Item onClick={() => onClick('copy')}>Duplicate</Menu.Item>
          </Menu.Content>
        </Menu>
      )
      const user = userEvent.setup()
      slowFrames()
      const from = screen.getByRole('button', { name: 'Show' })
      await pickMenuItem(user, { from, item: 'Edit' })
      await pickMenuItem(user, { from, item: 'Duplicate' })
      expect(onClick.mock.calls).toEqual([['edit'], ['copy']])
    })
  }
)
