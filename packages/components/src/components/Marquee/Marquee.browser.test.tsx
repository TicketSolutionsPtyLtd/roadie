import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Marquee } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

describe('Marquee', () => {
  it('reads its items out once when it repeats them to fill the width', async () => {
    render(
      <div style={{ width: 1000 }}>
        <Marquee>
          <span className='inline-block w-24'>Kazoo Hollow Room</span>
        </Marquee>
      </div>
    )

    await expect
      .poll(() => screen.getAllByText('Kazoo Hollow Room').length)
      .toBeGreaterThan(3)
    expect(
      screen
        .getAllByText('Kazoo Hollow Room')
        .filter((item) => !item.closest('[aria-hidden="true"]'))
    ).toHaveLength(1)
  })
})
