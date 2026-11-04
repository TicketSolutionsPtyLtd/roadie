import { Fragment, useEffect, useState } from 'react'

import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { Navigator } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Pane } from '../Pane'
import { forgetPaneScroll } from '../Pane/paneScroll'
import { useStylesheet } from '../Pane/testUtils'
import { Prose } from '../Prose'
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

function Shows({ prose = false }: { prose?: boolean }) {
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
          {value === '/shows' && !prose && (
            <div className='grid gap-4'>
              {Array.from({ length: 120 }, (_, index) => (
                <p key={index}>Line {index + 1} of the Rolling Kazoos tour</p>
              ))}
            </div>
          )}
          {value === '/shows' && prose && (
            <Prose>
              {Array.from({ length: 40 }, (_, index) => (
                <Fragment key={index}>
                  <h2>Night {index + 1}</h2>
                  <p>Line {index + 1} of the Rolling Kazoos tour</p>
                </Fragment>
              ))}
            </Prose>
          )}
        </Pane>
      </Navigator>
    </div>
  )
}

const ghost = () =>
  document.querySelector<HTMLElement>('[data-slot="navigator-page-ghost"]')!

const topViewport = () =>
  document.querySelector<HTMLElement>(
    '[data-stack-position="top"] [data-slot="pane-viewport"]'
  )!

function topIn(root: ParentNode, text: string) {
  const viewport = root.querySelector('[data-slot="pane-viewport"]')!
  const line = Array.from(root.querySelectorAll('p')).find(
    (p) => p.textContent === text
  )!
  return line.getBoundingClientRect().top - viewport.getBoundingClientRect().top
}

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

  it('keeps what shows where it was, with tag-styled pages scrolled past', async () => {
    render(<Shows prose />)
    await expect
      .poll(() => topViewport()?.scrollHeight ?? 0)
      .toBeGreaterThan(3000)
    topViewport().scrollTop = 1500
    const line = Array.from(topViewport().querySelectorAll('p')).find((p) => {
      const top = topIn(document, p.textContent ?? '')
      return top > 100 && top < 600
    })!
    const text = line.textContent ?? ''
    const before = topIn(document, text)
    go('/shows/1')
    await expect.poll(() => ghost().childElementCount).toBe(1)
    expect(ghost().textContent).not.toContain('Line 1 of')
    expect(Math.abs(topIn(ghost(), text) - before)).toBeLessThanOrEqual(1)
  })
})
