import { cleanup, render } from '@testing-library/react'
import axe from 'axe-core'
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

describe('reference dashboards are accessible', () => {
  it.each([
    ['show', createShowDashboard()],
    ['portfolio', createPortfolioDashboard()]
  ])('%s has no axe violations', async (_, spec) => {
    const { container } = render(
      <main>
        <h1>Dashboard</h1>
        <DashboardView spec={spec} />
      </main>
    )
    const results = await axe.run(container)
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual(
      []
    )
  })
})
