import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { Pane } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { PANE_CHROME_NONE } from './PaneChromeContext'
import {
  PaneStackContext,
  type PaneStackContextValue
} from './PaneStackContext'
import { forgetPaneScroll } from './paneScroll'
import { useStylesheet } from './testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await page.viewport(390, 844)
})
afterAll(async () => {
  removeStylesheet()
  await page.viewport(1920, 1080)
})
afterEach(() => {
  cleanup()
  forgetPaneScroll()
})

const stack: PaneStackContextValue = {
  register: () => {},
  unregister: () => {},
  placeOf: () => ({
    position: null,
    depth: 0,
    chrome: PANE_CHROME_NONE,
    isRoot: true,
    registered: true
  }),
  markPushing: () => {},
  topNow: () => null,
  moreOpen: false,
  level: 0
}

const clearance = () =>
  getComputedStyle(document.querySelector('[data-slot="pane-viewport"]')!)
    .paddingBottom

describe('tab bar clearance on a phone', () => {
  it('clears the floating tab bar in a Navigator’s stack', () => {
    render(
      <PaneStackContext value={stack}>
        <Pane>Body</Pane>
      </PaneStackContext>
    )
    expect(clearance()).toBe('96px')
  })

  it('leaves none outside a Navigator, which has no tab bar', () => {
    render(<Pane>Body</Pane>)
    expect(clearance()).toBe('0px')
  })

  it('leaves none when the pane hides the tab bar', () => {
    render(
      <PaneStackContext value={stack}>
        <Pane tabBar='hidden'>Body</Pane>
      </PaneStackContext>
    )
    expect(clearance()).toBe('0px')
  })
})
