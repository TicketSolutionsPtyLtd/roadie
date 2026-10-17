import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Toolbar } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

describe('Toolbar on a touch screen', () => {
  it('keeps its items on one row at any width', () => {
    render(
      <div style={{ width: 320 }}>
        <Toolbar aria-label='Formatting'>
          {['Bold', 'Italic', 'Underline', 'Link', 'Quote', 'Insert image'].map(
            (action) => (
              <Toolbar.Button key={action}>{action}</Toolbar.Button>
            )
          )}
        </Toolbar>
      </div>
    )
    const tops = new Set(
      screen
        .getAllByRole('button')
        .map((button) => Math.round(button.getBoundingClientRect().top))
    )
    expect(matchMedia('(pointer: coarse)').matches).toBe(true)
    expect(tops.size).toBe(1)
  })
})
