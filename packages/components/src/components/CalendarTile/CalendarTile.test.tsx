import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CalendarTile } from './index'

describe('CalendarTile', () => {
  it('renders month over day', () => {
    const { container } = render(<CalendarTile month='NOV' day={27} />)
    expect(container.textContent).toBe('NOV27')
  })

  it('leads with the weekday when given one', () => {
    const { container } = render(
      <CalendarTile month='NOV' weekday='FRI' day={27} />
    )
    expect(container.textContent).toBe('FRI27')
  })

  it('never renders a year — the tile is decorative', () => {
    const { container } = render(
      <CalendarTile month='NOV' day={27} label='Friday, 27 November 2026' />
    )
    expect(container.textContent).not.toContain('2026')
  })

  it('exposes the full date to assistive tech when labelled', () => {
    render(
      <CalendarTile month='NOV' day={27} label='Friday, 27 November 2026' />
    )
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Friday, 27 November 2026'
    )
  })

  it('is hidden from assistive tech when unlabelled', () => {
    const { container } = render(<CalendarTile month='NOV' day={27} />)
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('defaults to the container radius', () => {
    const { container } = render(<CalendarTile month='NOV' day={27} />)
    expect(container.firstChild).toHaveClass('rounded-xl')
  })

  it('lets a Tailwind radius class override the default', () => {
    const { container } = render(
      <CalendarTile month='NOV' day={27} className='rounded-none' />
    )
    expect(container.firstChild).toHaveClass('rounded-none')
    expect(container.firstChild).not.toHaveClass('rounded-xl')
  })
})

describe('CalendarTile as a time element', () => {
  it('stays a plain box when decorative', () => {
    const { container } = render(<CalendarTile month='NOV' day={27} />)
    expect(container.firstChild).toHaveProperty('tagName', 'DIV')
  })

  it('becomes a time element when given a machine value', () => {
    const { container } = render(
      <CalendarTile month='NOV' day={27} dateTime='2026-11-27' />
    )
    const el = container.firstChild as HTMLElement
    expect(el.tagName).toBe('TIME')
    expect(el).toHaveAttribute('dateTime', '2026-11-27')
    // No longer hidden: it is now the date, not decoration.
    expect(el).not.toHaveAttribute('aria-hidden')
  })

  it('keeps the label as the accessible name', () => {
    const { container } = render(
      <CalendarTile
        month='NOV'
        day={27}
        dateTime='2026-11-27'
        label='Friday, 27 November 2026'
      />
    )
    expect(container.firstChild).toHaveAttribute(
      'aria-label',
      'Friday, 27 November 2026'
    )
  })

  // Without this it would announce 'NOV 27': no weekday, no year.
  it('falls back to the machine value when a time tile has no label', () => {
    const { container } = render(
      <CalendarTile month='NOV' day={27} dateTime='2026-11-27' />
    )
    expect(container.firstChild).toHaveAttribute('aria-label', '2026-11-27')
  })

  describe('surfaces', () => {
    const tile = (props = {}) => {
      const { container } = render(
        <CalendarTile month='NOV' day={27} {...props} />
      )
      const root = container.firstChild as HTMLElement
      return {
        root,
        top: root.querySelector('[data-slot="calendar-tile-top"]')!,
        day: root.querySelector('[data-slot="calendar-tile-day"]')!
      }
    }

    it('caps a light tile with the saturated preset', () => {
      const { root, top } = tile({ emphasis: 'subtle' })
      expect(root).toHaveClass('emphasis-subtle')
      expect(top).toHaveClass('emphasis-strong')
    })

    // The band cannot repeat the body's own fill or it stops being a band.
    it('inverts the cap on a strong tile', () => {
      const { root, top } = tile({ emphasis: 'strong' })
      expect(root).toHaveClass('emphasis-strong')
      expect(top).toHaveClass('emphasis-normal')
    })

    it('leaves the day to inherit its colour from the tile', () => {
      expect(tile({ emphasis: 'strong' }).day).not.toHaveClass('text-subtle')
      expect(tile({ emphasis: 'subtle' }).root).toHaveClass('text-subtle')
    })

    // Intent flows down the cascade, so a tile in an intent-brand card is brand.
    it('sets no intent of its own', () => {
      expect(tile().root.className).not.toMatch(/intent-/)
      expect(tile({ intent: 'brand' }).root).toHaveClass('intent-brand')
    })
  })
})
