import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import roadieCss from '../../vitest.browser.css?inline'
import { useStylesheet } from '../components/Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const fontStyle = (testId: string) =>
  getComputedStyle(screen.getByTestId(testId)).fontStyle

describe('the reset', () => {
  it.each(['i', 'em', 'cite', 'dfn', 'var', 'address'] as const)(
    'sets <%s> upright outside Prose',
    (Tag) => {
      render(<Tag data-testid='slanted'>Doors at 7pm</Tag>)

      expect(fontStyle('slanted')).toBe('normal')
    }
  )

  it('lets text inside an italic parent inherit its slant', () => {
    render(
      <p className='italic'>
        <span data-testid='inside'>Doors at 7pm</span>
      </p>
    )

    expect(fontStyle('inside')).toBe('italic')
  })
})
