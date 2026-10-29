import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RichText } from '.'
import {
  DESKTOP,
  atWidth,
  axeViolations,
  widths,
  withBrowserPage
} from '../_test/browser'
import { articleBody, statement } from './fixtures'

withBrowserPage()

const centreOf = (element: Element) => {
  const { left, width } = element.getBoundingClientRect()
  return left + width / 2
}

describe('RichText statement', () => {
  it('centres its paragraphs under the title, at the xl text size', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    const { container } = render(<RichText {...statement} />)
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

  it('leaves the space around it to the page', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    const { container } = render(<RichText {...statement} />)
    const section = container.querySelector('section')!
    const illustration = section.querySelector('svg')!

    expect(illustration.getBoundingClientRect().top).toBeCloseTo(
      section.getBoundingClientRect().top,
      0
    )
  })
})

describe('RichText article-body', () => {
  it('holds the body to a reading width on a wide screen', async () => {
    await atWidth(1920, 1080)
    const { container } = render(<RichText {...articleBody} />)
    const paragraph = container.querySelector('.prose p')!

    expect(paragraph.getBoundingClientRect().width).toBeLessThan(800)
    expect(getComputedStyle(paragraph).textAlign).toBe('start')
  })
})

describe.each([
  ['statement', statement],
  ['article-body', articleBody]
])('RichText %s accessibility', (_, props) => {
  it.each(widths)(
    'has no axe violations on a $name',
    async ({ width, height }) => {
      await atWidth(width, height)
      const { container } = render(<RichText {...props} />)

      expect(await axeViolations(container)).toEqual([])
    }
  )
})
