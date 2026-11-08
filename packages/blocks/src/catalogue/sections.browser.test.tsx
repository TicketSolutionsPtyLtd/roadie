import { render } from '@testing-library/react'
import { describe, expect, it, onTestFinished } from 'vitest'

import { Cards } from '../Cards'
import { withBrowserPage } from '../_test/browser'
import { MODES, setMode } from '../_test/contrast'
import { catalogueSections } from './sections'

withBrowserPage()

const [cards] = catalogueSections({ components: { cards: Cards } })

describe('catalogueSections while editing', () => {
  it.each(MODES)(
    'draws a photo waiting on its image from the sunken surface in %s mode',
    (mode) => {
      setMode(mode)
      onTestFinished(() => setMode('light'))
      render(
        cards!.render({
          attrs: {
            ...cards!.attrs,
            preset: 'photo',
            cards: [{ title: 'Kazoo Hollow' }]
          },
          editing: true
        })
      )
      const placeholder = document.querySelector(
        '[data-slot=block-image-placeholder]'
      )!
      const glyph = placeholder.querySelector('svg')!
      // Beside it, so it reads the same surface the card sets around it.
      const reference = document.createElement('div')
      reference.className = 'bg-sunken text-subtler'
      placeholder.after(reference)
      const sunken = getComputedStyle(reference)

      expect(getComputedStyle(placeholder).backgroundColor).toBe(
        sunken.backgroundColor
      )
      expect(getComputedStyle(glyph).color).toBe(sunken.color)
      const box = placeholder.getBoundingClientRect()
      const drawn = glyph.getBoundingClientRect()
      expect(box.height).toBeGreaterThan(0)
      expect(drawn.top - box.top).toBeCloseTo(box.bottom - drawn.bottom, 0)
      expect(drawn.left - box.left).toBeCloseTo(box.right - drawn.right, 0)
    }
  )
})
