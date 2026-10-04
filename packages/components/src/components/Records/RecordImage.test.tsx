import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { recordFields } from '@oztix/roadie-core/records'

import { RecordImage } from './RecordImage'

const part = {
  key: 'image',
  field: recordFields().text('image', { label: 'Image' })
}

describe('RecordImage', () => {
  it.each([
    ['a thumbnail', false],
    ['a banner', true]
  ])(
    'shows an image icon on a neutral tile for %s without an image',
    (_, banner) => {
      const { container } = render(
        <RecordImage part={part} row={{ image: '' }} banner={banner} />
      )
      const tile = container.querySelector(
        '[data-slot="record-image-placeholder"]'
      )!
      expect(tile).toHaveClass('bg-subtle')
      expect(tile.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    }
  )
})
