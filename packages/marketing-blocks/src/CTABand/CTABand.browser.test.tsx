import { render, screen } from '@testing-library/react'
import { describe, expect, it, onTestFinished } from 'vitest'
import { page } from 'vitest/browser'

import { CTABand, type CTABandProps } from '.'
import {
  DESKTOP,
  PHONE,
  axeViolations,
  photo,
  withBrowserPage
} from '../_test/browser'

withBrowserPage()

const props: CTABandProps = {
  title: 'Explore an Oztix partnership',
  titleHighlight: 'partnership',
  body: <p>Let’s start with a get-to-know-you conversation.</p>,
  actions: [
    { label: 'Talk to us', href: '/contact/sales' },
    { label: 'Create my event', href: 'https://studio.oztix.com.au' }
  ],
  image: photo('Hands up at a gig')
}

function boxes() {
  const heading = screen.getByRole('heading', { level: 2 })
  const section = heading.closest('section')!
  return {
    section: section.getBoundingClientRect(),
    panel: section
      .querySelector('[data-slot=cta-band-panel]')!
      .getBoundingClientRect(),
    heading: heading.getBoundingClientRect(),
    photo: screen
      .getByRole('img', { name: 'Hands up at a gig' })
      .parentElement!.getBoundingClientRect()
  }
}

describe('CTABand with photo', () => {
  it('sets the photo above the copy on a phone, breaking out of the panel', async () => {
    await page.viewport(PHONE.width, PHONE.height)
    render(<CTABand preset='with-photo' {...props} />)

    const { section, panel, heading, photo } = boxes()
    expect(photo.top).toBeLessThan(panel.top)
    expect(photo.top).toBeGreaterThanOrEqual(section.top)
    expect(photo.bottom).toBeLessThanOrEqual(heading.top)
  })

  it('sets the photo beside the copy on a mid-width screen', async () => {
    await page.viewport(640, 800)
    render(<CTABand preset='with-photo' {...props} />)

    const { section, panel, heading, photo } = boxes()
    expect(photo.top).toBeLessThan(panel.top)
    expect(photo.top).toBeGreaterThanOrEqual(section.top)
    expect(photo.left).toBeGreaterThan(heading.left + heading.width / 2)
  })

  it('sets the photo above the copy in a narrow column on a desktop', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    render(
      <div style={{ width: 400 }}>
        <CTABand preset='with-photo' {...props} />
      </div>
    )

    const { heading, photo } = boxes()
    expect(photo.bottom).toBeLessThanOrEqual(heading.top)
  })

  it('sets the photo beside the copy on a desktop, breaking out of the panel', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    render(<CTABand preset='with-photo' {...props} />)

    const { section, panel, heading, photo } = boxes()
    expect(photo.top).toBeLessThan(panel.top)
    expect(photo.top).toBeGreaterThanOrEqual(section.top)
    expect(photo.left).toBeGreaterThan(heading.left + heading.width / 2)
    expect(photo.left).toBeGreaterThanOrEqual(
      screen
        .getByRole('link', { name: 'Create my event' })
        .getBoundingClientRect().right
    )
  })

  it('has no axe violations', async () => {
    const { container } = render(<CTABand preset='with-photo' {...props} />)

    expect(await axeViolations(container)).toEqual([])
  })
})

describe('CTABand with photo, its photo', () => {
  it('crops a landscape photo to the portrait frame', async () => {
    render(<CTABand preset='with-photo' {...props} />)

    const img = screen.getByRole('img', { name: 'Hands up at a gig' })
    const frame = img.parentElement!
    expect(img.offsetWidth).toBe(frame.clientWidth)
    expect(img.offsetHeight).toBe(frame.clientHeight)
    expect(frame.clientHeight).toBeGreaterThan(frame.clientWidth)
  })
})

describe('CTABand body', () => {
  it.each(['with-photo', 'centred'] as const)(
    'sets the %s body in subtle text, closing on a medium-weight line',
    (preset) => {
      render(
        <CTABand
          preset={preset}
          title='Explore an Oztix partnership'
          body={
            <>
              <p>Let’s start with a conversation.</p>
              <p>Ready to move fast? We’re on it.</p>
            </>
          }
        />
      )
      const subtle = document.createElement('span')
      subtle.className = 'text-subtle'
      document.body.append(subtle)
      onTestFinished(() => subtle.remove())

      const opening = getComputedStyle(
        screen.getByText('Let’s start with a conversation.')
      )
      const closing = getComputedStyle(
        screen.getByText('Ready to move fast? We’re on it.')
      )
      expect(opening.color).toBe(getComputedStyle(subtle).color)
      expect(opening.fontWeight).toBe('400')
      expect(closing.fontWeight).toBe('500')
    }
  )
})

describe('CTABand centred', () => {
  it('centres the heading and actions in the panel', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    render(<CTABand preset='centred' {...props} />)

    const heading = screen.getByRole('heading', { level: 2 })
    const panel = heading
      .closest('section')!
      .querySelector('[data-slot=cta-band-panel]')!
      .getBoundingClientRect()
    const centre = (box: DOMRect) => box.left + box.width / 2
    const links = screen
      .getAllByRole('link')
      .map((link) => link.getBoundingClientRect())
    const actions = {
      left: links[0]!.left,
      width: links.at(-1)!.right - links[0]!.left
    } as DOMRect

    expect(centre(heading.getBoundingClientRect())).toBeCloseTo(
      centre(panel),
      0
    )
    expect(centre(actions)).toBeCloseTo(centre(panel), 0)
  })

  it('has no axe violations', async () => {
    const { container } = render(<CTABand preset='centred' {...props} />)

    expect(await axeViolations(container)).toEqual([])
  })
})
