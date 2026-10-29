import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { CtaBand, type CtaBandProps } from '.'
import {
  DESKTOP,
  PHONE,
  axeViolations,
  withBrowserPage
} from '../_shared/testUtils'

withBrowserPage()

const props: CtaBandProps = {
  title: 'Explore an Oztix partnership',
  titleHighlight: 'partnership',
  body: <p>Let’s start with a get-to-know-you conversation.</p>,
  actions: [
    { label: 'Talk to us', href: '/contact/sales' },
    { label: 'Create my event', href: 'https://studio.oztix.com.au' }
  ],
  image: { src: '/brand/photography/04.webp', alt: 'Hands up at a gig' }
}

function boxes() {
  const heading = screen.getByRole('heading', { level: 2 })
  return {
    panel: heading
      .closest('section')!
      .firstElementChild!.getBoundingClientRect(),
    heading: heading.getBoundingClientRect(),
    photo: screen
      .getByRole('img', { name: 'Hands up at a gig' })
      .parentElement!.getBoundingClientRect()
  }
}

describe('CtaBand studio CTA', () => {
  it('sets the photo above the copy on a phone, breaking out of the panel', async () => {
    await page.viewport(PHONE.width, PHONE.height)
    render(<CtaBand preset='studio-cta' {...props} />)

    const { panel, heading, photo } = boxes()
    expect(photo.top).toBeLessThan(panel.top)
    expect(photo.bottom).toBeLessThanOrEqual(heading.top)
  })

  it('sets the photo beside the copy on a desktop, breaking out of the panel', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    render(<CtaBand preset='studio-cta' {...props} />)

    const { panel, heading, photo } = boxes()
    expect(photo.top).toBeLessThan(panel.top)
    expect(photo.left).toBeGreaterThan(heading.left + heading.width / 2)
    expect(photo.left).toBeGreaterThanOrEqual(
      screen
        .getByRole('link', { name: 'Create my event' })
        .getBoundingClientRect().right
    )
  })

  it('has no axe violations', async () => {
    const { container } = render(<CtaBand preset='studio-cta' {...props} />)

    expect(await axeViolations(container)).toEqual([])
  })
})

describe('CtaBand talk to us', () => {
  it('centres the heading and actions in the panel', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    render(<CtaBand preset='talk-to-us' {...props} />)

    const heading = screen.getByRole('heading', { level: 2 })
    const panel = heading
      .closest('section')!
      .firstElementChild!.getBoundingClientRect()
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
    const { container } = render(<CtaBand preset='talk-to-us' {...props} />)

    expect(await axeViolations(container)).toEqual([])
  })
})
