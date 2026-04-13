import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Carousel } from './index'

describe('Carousel', () => {
  it('renders with a single slide (smoke)', () => {
    const { queryByTestId } = render(
      <Carousel aria-label='test carousel'>
        <div data-testid='slide'>slide</div>
      </Carousel>
    )
    // Phase 1 stub returns null; Phase 2 will flip this to expect the
    // slide to be in the document.
    expect(queryByTestId('slide')).toBeNull()
  })
})
