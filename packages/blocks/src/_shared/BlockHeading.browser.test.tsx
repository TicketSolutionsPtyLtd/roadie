import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { withBrowserPage } from '../_test/browser'
import { BlockHeading } from './BlockHeading'

withBrowserPage()

describe('BlockHeading', () => {
  it.each([
    ['h1', 1, undefined],
    ['h2', 2, undefined],
    ['h2', 2, 'md'],
    ['h2', 2, 'sm']
  ] as const)(
    'sets the %s title black (900) at level %i, size %s, and leaves the eyebrow and description be',
    (tag, level, size) => {
      const { container } = render(
        <BlockHeading
          level={level}
          size={size}
          eyebrow='Partners'
          title='Why Oztix'
          description='We help event organisers sell more tickets.'
        />
      )
      const weightOf = (element: Element) =>
        getComputedStyle(element).fontWeight

      expect(weightOf(container.querySelector(tag)!)).toBe('900')
      const [eyebrow, description] = container.querySelectorAll('p')
      expect(weightOf(eyebrow!)).toBe('700')
      expect(weightOf(description!)).not.toBe('900')
    }
  )

  it('breaks a long word rather than widening an auto grid track', () => {
    const { container } = render(
      <div className='grid w-[320px]'>
        <BlockHeading
          title='Ticketverkaufsplattformenvergleichsübersicht'
          description='Eintrittskartenvorverkaufsstellenbetreiberverband'
        />
      </div>
    )

    const heading = container.querySelector('h2')!.parentElement!
    expect(heading.getBoundingClientRect().width).toBeLessThanOrEqual(320)
  })

  const DESCRIPTION =
    'From festivals to local venues, we help event organisers sell more tickets.'
  const lines = (element: Element) =>
    Math.round(
      element.getBoundingClientRect().height /
        parseFloat(getComputedStyle(element).lineHeight)
    )

  it('runs a start-aligned description of a sentence on one line', () => {
    const { getByText } = render(
      <div className='grid w-[1280px]'>
        <BlockHeading
          align='start'
          title='Join thousands of partners who trust Oztix'
          description={DESCRIPTION}
        />
      </div>
    )

    expect(lines(getByText(DESCRIPTION))).toBe(1)
  })

  it('keeps a centred description to a balanced measure', () => {
    const { getByText } = render(
      <div className='grid w-[1280px]'>
        <BlockHeading
          align='center'
          title='Join thousands of partners who trust Oztix'
          description={DESCRIPTION}
        />
      </div>
    )

    const description = getByText(DESCRIPTION)
    expect(description.getBoundingClientRect().width).toBeLessThanOrEqual(768)
    expect(getComputedStyle(description).textWrapStyle).toBe('balance')
  })
})
