import { Fragment, type ReactNode, useEffect, useState } from 'react'

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

function Shows({
  prose = false,
  children
}: {
  prose?: boolean
  children?: ReactNode
}) {
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
          {value === '/shows' && children}
          {value === '/shows' && !prose && !children && (
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

const ghostViewport = () =>
  ghost().querySelector<HTMLElement>('[data-slot="pane-viewport"]')!

function topIn(viewport: Element, text: string) {
  const line = Array.from(viewport.querySelectorAll('p')).find(
    (p) => p.textContent === text
  )!
  return line.getBoundingClientRect().top - viewport.getBoundingClientRect().top
}

describe('a page step on a phone', () => {
  it('copies only what shows of the page it leaves, at its full height', async () => {
    render(<Shows />)
    await expect
      .poll(() => topViewport()?.scrollHeight ?? 0)
      .toBeGreaterThan(2000)
    const height = topViewport().scrollHeight
    go('/shows/1')
    await expect.poll(() => ghost().childElementCount).toBe(1)
    const text = ghost().textContent
    expect(text).toContain('Line 1 of the Rolling Kazoos tour')
    expect(text).not.toContain('Line 110 of')
    expect(Math.abs(ghostViewport().scrollHeight - height)).toBeLessThanOrEqual(
      1
    )
  })

  it('keeps what shows where it was, with tag-styled pages scrolled past', async () => {
    render(<Shows prose />)
    await expect
      .poll(() => topViewport()?.scrollHeight ?? 0)
      .toBeGreaterThan(3000)
    topViewport().scrollTop = 1500
    const line = Array.from(topViewport().querySelectorAll('p')).find((p) => {
      const top = topIn(topViewport(), p.textContent ?? '')
      return top > 100 && top < 600
    })!
    const text = line.textContent ?? ''
    const before = topIn(topViewport(), text)
    go('/shows/1')
    await expect.poll(() => ghost().childElementCount).toBe(1)
    expect(ghost().textContent).not.toContain('Line 1 of')
    expect(Math.abs(topIn(ghostViewport(), text) - before)).toBeLessThanOrEqual(
      1
    )
  })

  it.each([
    ['a strong', <strong>{'Kazoo '.repeat(20)}</strong>],
    ['an inline block', <span style={{ display: 'inline-block' }}>Kazoo</span>],
    [
      'a ruby',
      <ruby>
        {'Kazoo '.repeat(20)}
        <rt>kz</rt>
      </ruby>
    ]
  ])(
    'keeps the lines of a paragraph that straddles the top where they were, with %s above',
    async (_, above) => {
      render(
        <Shows>
          <p>
            {'Encore '.repeat(10)}
            {above}
            {'Encore '.repeat(400)}
            <span data-mark>Mark</span>
            {'Encore '.repeat(400)}
          </p>
        </Shows>
      )
      await expect
        .poll(() => topViewport()?.scrollHeight ?? 0)
        .toBeGreaterThan(2000)
      const mark = (viewport: Element) => {
        const box = viewport
          .querySelector('[data-mark]')!
          .getBoundingClientRect()
        const view = viewport.getBoundingClientRect()
        return { top: box.top - view.top, left: box.left - view.left }
      }
      topViewport().scrollTop = mark(topViewport()).top - 300
      const before = mark(topViewport())
      go('/shows/1')
      await expect.poll(() => ghost().childElementCount).toBe(1)
      const after = mark(ghostViewport())
      expect(Math.abs(after.top - before.top)).toBeLessThanOrEqual(1)
      expect(Math.abs(after.left - before.left)).toBeLessThanOrEqual(1)
    }
  )

  it.each([
    [
      'inside inlines',
      (line: ReactNode, key: number) => (
        <span key={key}>
          <p>{line}</p>
        </span>
      )
    ],
    [
      'whose margins collapse through their wrappers',
      (line: ReactNode, key: number) => (
        <div key={key}>
          <p className='mt-6'>{line}</p>
        </div>
      )
    ]
  ])('copies only what shows of lines %s, where they were', async (_, wrap) => {
    render(
      <Shows>
        <div>
          {Array.from({ length: 120 }, (_, index) =>
            wrap(`Line ${index + 1} of the Rolling Kazoos tour`, index)
          )}
        </div>
      </Shows>
    )
    await expect
      .poll(() => topViewport()?.scrollHeight ?? 0)
      .toBeGreaterThan(2500)
    topViewport().scrollTop = 1500
    const line = Array.from(topViewport().querySelectorAll('p')).find((p) => {
      const top = topIn(topViewport(), p.textContent ?? '')
      return top > 100 && top < 600
    })!
    const text = line.textContent ?? ''
    const before = topIn(topViewport(), text)
    go('/shows/1')
    await expect.poll(() => ghost().childElementCount).toBe(1)
    expect(ghost().textContent).not.toContain('Line 1 of')
    expect(Math.abs(topIn(ghostViewport(), text) - before)).toBeLessThanOrEqual(
      1
    )
  })

  it.each([0, 8, 16, 24, 32, 40])(
    'keeps wrapped lines where they were with one straddling the top, %ipx down',
    async (offset) => {
      render(
        <Shows>
          <div>
            {Array.from({ length: 120 }, (_, index) => (
              <div key={index}>
                <p className='mt-6'>{`Line ${index + 1} of the Rolling Kazoos tour`}</p>
              </div>
            ))}
          </div>
        </Shows>
      )
      await expect
        .poll(() => topViewport()?.scrollHeight ?? 0)
        .toBeGreaterThan(2500)
      topViewport().scrollTop = 1500 + offset
      const line = Array.from(topViewport().querySelectorAll('p')).find((p) => {
        const top = topIn(topViewport(), p.textContent ?? '')
        return top > 100 && top < 600
      })!
      const text = line.textContent ?? ''
      const before = topIn(topViewport(), text)
      go('/shows/1')
      await expect.poll(() => ghost().childElementCount).toBe(1)
      expect(ghost().textContent).not.toContain('Line 1 of')
      expect(
        Math.abs(topIn(ghostViewport(), text) - before)
      ).toBeLessThanOrEqual(1)
    }
  )

  it('keeps a paragraph that fills the view where it was, below wrapped lines', async () => {
    render(
      <Shows>
        <div>
          {Array.from({ length: 40 }, (_, index) => (
            <div key={index}>
              <p className='mt-6'>{`Line ${index + 1} of the Rolling Kazoos tour`}</p>
            </div>
          ))}
          <div>
            <p className='mt-6' data-long>
              {'Encore '.repeat(1000)}
            </p>
          </div>
        </div>
      </Shows>
    )
    await expect
      .poll(() => topViewport()?.scrollHeight ?? 0)
      .toBeGreaterThan(4000)
    const long = (viewport: Element) =>
      viewport.querySelector('[data-long]')!.getBoundingClientRect().top -
      viewport.getBoundingClientRect().top
    topViewport().scrollTop += long(topViewport()) + 600
    const before = long(topViewport())
    go('/shows/1')
    await expect.poll(() => ghost().childElementCount).toBe(1)
    expect(ghost().textContent).not.toContain('Line 1 of')
    expect(Math.abs(long(ghostViewport()) - before)).toBeLessThanOrEqual(1)
  })

  it('leaves what shows where it was when the only stand-in is below it', async () => {
    render(
      <Shows>
        <div>
          <p>{'Encore '.repeat(300)}</p>
          {Array.from({ length: 6 }, (_, index) => (
            <p key={index}>{`Line ${index + 1} of the Rolling Kazoos tour`}</p>
          ))}
          <div style={{ marginTop: 2000 }}>
            <p className='mb-6'>Below</p>
          </div>
          <span style={{ display: 'inline-block' }}>Tail</span>
        </div>
      </Shows>
    )
    await expect
      .poll(() => topViewport()?.scrollHeight ?? 0)
      .toBeGreaterThan(2500)
    const text = 'Line 3 of the Rolling Kazoos tour'
    topViewport().scrollTop += topIn(topViewport(), text) - 300
    const before = topIn(topViewport(), text)
    go('/shows/1')
    await expect.poll(() => ghost().childElementCount).toBe(1)
    expect(ghost().textContent).not.toContain('Below')
    expect(Math.abs(topIn(ghostViewport(), text) - before)).toBeLessThanOrEqual(
      1
    )
  })
})
