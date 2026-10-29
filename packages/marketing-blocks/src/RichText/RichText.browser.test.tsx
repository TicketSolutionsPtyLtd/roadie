import type { ReactElement } from 'react'

import { cleanup, render } from '@testing-library/react'
import axe from 'axe-core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { RichText } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import { articleBody, statement } from './testUtils'

let style: HTMLStyleElement

beforeAll(() => {
  style = document.createElement('style')
  style.textContent = roadieCss
  document.head.append(style)
})

afterAll(async () => {
  style.remove()
  await page.viewport(1920, 1080)
})

async function showAt(width: number, ui: ReactElement) {
  cleanup()
  await page.viewport(width, 900)
  return render(ui)
}

const centreOf = (element: Element) => {
  const { left, width } = element.getBoundingClientRect()
  return left + width / 2
}

describe('RichText statement', () => {
  it('centres its paragraphs under the title, at the xl text size', async () => {
    const { container } = await showAt(1280, <RichText {...statement} />)
    const [first] = container.querySelectorAll('.prose p')
    const title = container.querySelector('h2')!
    const probe = document.createElement('p')
    probe.className = 'text-xl'
    document.body.append(probe)

    expect(getComputedStyle(first!).textAlign).toBe('center')
    expect(centreOf(first!)).toBeCloseTo(centreOf(title), 0)
    expect(getComputedStyle(first!).fontSize).toBe(
      getComputedStyle(probe).fontSize
    )
    probe.remove()
  })
})

describe('RichText article-body', () => {
  it('holds the body to a reading width on a wide screen', async () => {
    const { container } = await showAt(1920, <RichText {...articleBody} />)
    const paragraph = container.querySelector('.prose p')!

    expect(paragraph.getBoundingClientRect().width).toBeLessThan(800)
    expect(getComputedStyle(paragraph).textAlign).toBe('start')
  })
})

async function seriousViolations() {
  const { violations } = await axe.run(document, {
    resultTypes: ['violations'],
    // Roadie measures contrast with APCA instead (docs/decisions/0010-apca-contrast.md).
    rules: { 'color-contrast': { enabled: false } }
  })
  return violations
    .filter(({ impact }) => impact === 'serious' || impact === 'critical')
    .map(
      ({ id, nodes }) => `${id}: ${nodes.map(({ html }) => html).join(', ')}`
    )
}

describe.each([
  ['statement', statement],
  ['article-body', articleBody]
])('RichText %s accessibility', (_, props) => {
  it.each([390, 1280])(
    'has no serious axe violations at %ipx',
    async (width) => {
      await showAt(width, <RichText {...props} />)

      expect(await seriousViolations()).toEqual([])
    }
  )
})
