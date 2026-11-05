import { describe, expect, it } from 'vitest'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { Menu } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { EventPage, byText, pressEscape } from '../../utils/frameTestUtils'

setupFrameTests({ css: roadieCss })

const popup = () => document.querySelector('[data-slot="menu-popup"]')

describe('Menu opens and closes at 60fps on a slowed CPU', () => {
  it('opens over a page of events and closes again', async () => {
    await mount(
      <EventPage>
        <Menu>
          <Menu.Trigger>Actions</Menu.Trigger>
          <Menu.Content>
            {['Edit', 'Duplicate', 'Share', 'Export orders', 'Archive'].map(
              (label) => (
                <Menu.Item key={label}>{label}</Menu.Item>
              )
            )}
          </Menu.Content>
        </Menu>
      </EventPage>,
      { frames: 5 }
    )
    const trigger = byText('button', 'Actions')
    await expectFrameBudget(
      'Menu, open',
      await measureFrames((index) => index === 0 && trigger.click(), {
        frames: 60
      })
    )
    expect(popup()).not.toBeNull()
    await expectFrameBudget(
      'Menu, close',
      await measureFrames((index) => index === 0 && pressEscape(), {
        frames: 60
      })
    )
    expect(popup()).toBeNull()
  })
})
