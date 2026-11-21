import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { CommandPalette } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { tapOn } from '../../utils/touchTestUtils'
import { useStylesheet } from '../Pane/testUtils'

const TIMEOUT = { timeout: 20_000 }

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await page.viewport(390, 844)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

type Command = { label: string; page?: string }

const options = () =>
  screen.queryAllByRole('option').map((option) => option.textContent)

describe('CommandPalette by touch', TIMEOUT, () => {
  it('goes back a page with a tap on its chip', async () => {
    render(
      <CommandPalette
        defaultOpen
        shortcut={false}
        items={[
          { label: 'Change status…', page: 'status' },
          { label: 'Invite teammate' }
        ]}
      >
        <CommandPalette.Input />
        <CommandPalette.List>
          {(command: Command) => (
            <CommandPalette.Item
              key={command.label}
              value={command}
              page={command.page}
            >
              {command.label}
            </CommandPalette.Item>
          )}
        </CommandPalette.List>
        <CommandPalette.Page
          value='status'
          label='Change status'
          items={['Draft', 'On sale', 'Sold out']}
        >
          <CommandPalette.List>
            {(status: string) => (
              <CommandPalette.Item key={status} value={status}>
                {status}
              </CommandPalette.Item>
            )}
          </CommandPalette.List>
        </CommandPalette.Page>
      </CommandPalette>
    )
    await tapOn(await screen.findByRole('option', { name: 'Change status…' }))
    await expect.poll(options).toEqual(['Draft', 'On sale', 'Sold out'])
    await tapOn(screen.getByRole('button', { name: 'Back to all commands' }))
    await expect.poll(options).toEqual(['Change status…', 'Invite teammate'])
    await expect.element(page.getByRole('combobox')).toHaveFocus()
  })
})
