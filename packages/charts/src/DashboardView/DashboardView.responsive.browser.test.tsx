import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { DashboardView } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import { createPortfolioDashboard, createShowDashboard } from '../examples'

function useStylesheet(css: string) {
  const style = document.createElement('style')
  style.textContent = css
  document.head.append(style)
  return () => style.remove()
}

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const PHONE_CONTENT_WIDTH = 328
const TABLET_CONTENT_WIDTH = 600

describe('reference dashboards fit a phone width', () => {
  it.each([
    ['show', createShowDashboard()],
    ['portfolio', createPortfolioDashboard()]
  ])('%s stat tiles do not truncate at 328px', (_, spec) => {
    const { container } = render(
      <div style={{ width: PHONE_CONTENT_WIDTH }}>
        <DashboardView spec={spec} />
      </div>
    )
    const truncated: string[] = []
    for (const card of container.querySelectorAll<HTMLElement>(
      '[data-slot=data-card]'
    )) {
      for (const el of card.querySelectorAll<HTMLElement>(
        '[data-slot=data-card-label], [data-slot=data-card-context]'
      )) {
        if (el.scrollWidth <= el.clientWidth) continue
        if (card.dataset.size === 'stat') {
          expect(el.scrollWidth).toBeLessThanOrEqual(el.clientWidth)
        } else {
          truncated.push(
            `${card.dataset.size}: ${el.dataset.slot} "${el.textContent}"`
          )
        }
      }
    }
    if (truncated.length > 0)
      console.warn('Non-stat cards truncate at 328px:', truncated)
  })
})

describe('reference dashboards fit a tablet width', () => {
  it.each([
    ['show', createShowDashboard()],
    ['portfolio', createPortfolioDashboard()]
  ])('%s cards do not truncate at 600px', (_, spec) => {
    const { container } = render(
      <div style={{ width: TABLET_CONTENT_WIDTH }}>
        <DashboardView spec={spec} />
      </div>
    )
    for (const el of container.querySelectorAll<HTMLElement>(
      '[data-slot=data-card-label], [data-slot=data-card-context]'
    )) {
      expect(el.scrollWidth).toBeLessThanOrEqual(el.clientWidth)
    }
  })
})
