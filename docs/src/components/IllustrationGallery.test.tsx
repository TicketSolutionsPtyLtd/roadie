import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'

import { SPOT_ILLUSTRATION_NAMES } from '@/lib/spot-illustrations'
import { textOf } from '@/lib/twinTestUtils'

import { IllustrationGallery } from './IllustrationGallery'

it('names every illustration its markdown twin lists, in order', () => {
  const text = textOf(renderToStaticMarkup(<IllustrationGallery />))
  expect(SPOT_ILLUSTRATION_NAMES.length).toBeGreaterThan(10)
  expect(text).toBe(SPOT_ILLUSTRATION_NAMES.join(''))
})
