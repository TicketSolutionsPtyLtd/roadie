import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { CheckboxGroup, type CheckboxGroupProps } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

function renderGenres({ direction }: Pick<CheckboxGroupProps, 'direction'>) {
  render(
    <div style={{ width: 600 }}>
      <CheckboxGroup direction={direction}>
        <CheckboxGroup.Item value='rock' label='Rock' />
        <CheckboxGroup.Item value='jazz' label='Jazz' />
      </CheckboxGroup>
    </div>
  )
  const box = (name: string) =>
    screen
      .getByRole('checkbox', { name })
      .closest('[data-slot="checkbox"]')!
      .getBoundingClientRect()
  return { rock: box('Rock'), jazz: box('Jazz') }
}

describe('CheckboxGroup direction', () => {
  it('stacks its items by default', () => {
    const { rock, jazz } = renderGenres({})
    expect(jazz.top).toBeGreaterThanOrEqual(rock.bottom)
    expect(jazz.left).toBe(rock.left)
  })

  it('lines its items up in a row when horizontal', () => {
    const { rock, jazz } = renderGenres({ direction: 'horizontal' })
    expect(jazz.top).toBe(rock.top)
    expect(jazz.left).toBeGreaterThanOrEqual(rock.right)
  })
})
