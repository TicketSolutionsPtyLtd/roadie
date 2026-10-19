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

const insetLayers = (element: HTMLElement) =>
  getComputedStyle(element)
    .boxShadow.split(/,(?![^(]*\))/)
    .filter((layer) => layer.includes('inset')).length

describe('rim light', () => {
  it('clears a focused raised field’s own rim', () => {
    render(
      <input
        aria-label='Search'
        className='is-interactive-field emphasis-raised'
      />
    )
    const field = screen.getByRole('textbox')
    expect(insetLayers(field)).toBeGreaterThan(0)

    field.focus()

    expect(insetLayers(field)).toBe(0)
  })

  it('keeps the rim of a raised surface inside a focused field group', () => {
    render(
      <div className='is-interactive-field-group emphasis-field'>
        <div data-testid='bar' className='emphasis-raised'>
          Bar
        </div>
        <input aria-label='Text' />
      </div>
    )
    screen.getByRole('textbox').focus()

    expect(insetLayers(screen.getByTestId('bar'))).toBeGreaterThan(0)
  })
})
