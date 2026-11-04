import { useEffect, useState } from 'react'

import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { Navigator } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Pane } from '../Pane'
import { forgetPaneScroll } from '../Pane/paneScroll'
import { useStylesheet } from '../Pane/testUtils'
import { withStubLink } from './testUtils'

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

let go: (value: string) => void = () => {}

function Shows() {
  const [value, setValue] = useState('/shows')
  useEffect(() => {
    go = setValue
  }, [])
  return withStubLink(
    <div style={{ height: '100vh', display: 'grid' }}>
      <Navigator value={value} onValueChange={setValue}>
        <Navigator.Primary aria-label='Promoter'>
          <Navigator.Item value='/shows' href='/shows'>
            Shows
            <Navigator.Secondary aria-label='Shows' overview>
              <Navigator.Item value='/shows/1' href='/shows/1'>
                Night one
              </Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
        <Pane>
          <Pane.Header>
            <Pane.Title>{value}</Pane.Title>
          </Pane.Header>
          {value === '/shows' && (
            <div className='grid gap-4'>
              {Array.from({ length: 120 }, (_, index) => (
                <p key={index}>Line {index + 1} of the Rolling Kazoos tour</p>
              ))}
            </div>
          )}
        </Pane>
      </Navigator>
    </div>
  )
}

const ghost = () =>
  document.querySelector<HTMLElement>('[data-slot="navigator-page-ghost"]')!

describe('a page step on a phone', () => {
  it('copies only what shows of the page it leaves, at its full height', async () => {
    render(<Shows />)
    const viewport = () =>
      document.querySelector<HTMLElement>(
        '[data-stack-position="top"] [data-slot="pane-viewport"]'
      )!
    await expect.poll(() => viewport()?.scrollHeight ?? 0).toBeGreaterThan(2000)
    const height = viewport().scrollHeight
    go('/shows/1')
    await expect.poll(() => ghost().childElementCount).toBe(1)
    const copy = ghost().querySelector<HTMLElement>(
      '[data-slot="pane-viewport"]'
    )!
    const text = ghost().textContent
    expect(text).toContain('Line 1 of the Rolling Kazoos tour')
    expect(text).not.toContain('Line 110 of')
    expect(Math.abs(copy.scrollHeight - height)).toBeLessThanOrEqual(1)
  })
})
