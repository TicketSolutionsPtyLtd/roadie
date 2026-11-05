import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Navigator } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Pane } from '../Pane'
import { useStylesheet } from '../Pane/testUtils'
import { FakeIcon, withStubLink } from './testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

describe('the generated list pane on a touch screen', () => {
  it('keeps each row a 44px target', () => {
    render(
      withStubLink(
        <div style={{ width: 1400, height: 800 }}>
          <Navigator value='/s/one'>
            <Navigator.Primary aria-label='Main'>
              <Navigator.Item value='/s' href='/s' icon={<FakeIcon />}>
                Secondary
                <Navigator.Secondary aria-label='Secondary pages'>
                  <Navigator.Item value='/s/one' href='/s/one'>
                    One
                  </Navigator.Item>
                  <Navigator.Item value='/s/two' href='/s/two'>
                    Two
                  </Navigator.Item>
                </Navigator.Secondary>
              </Navigator.Item>
            </Navigator.Primary>
            <Pane>Detail</Pane>
          </Navigator>
        </div>
      )
    )
    const heights = Array.from(
      document.querySelectorAll(
        '[data-navigator-secondary] [data-slot="list-item"]'
      ),
      (row) => row.getBoundingClientRect().height
    )
    expect(matchMedia('(pointer: coarse)').matches).toBe(true)
    expect(heights).toEqual([44, 44])
  })
})
