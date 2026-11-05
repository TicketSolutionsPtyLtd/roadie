import { cleanup, render, screen } from '@testing-library/react'
import axe from 'axe-core'
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

  it('lets only the first copy of a link take focus', async () => {
    const { container } = render(
      <div style={{ width: 1000 }}>
        <Marquee>
          <a href='/venues' className='inline-block w-24'>
            Kazoo Hollow Room
          </a>
        </Marquee>
      </div>
    )

    await expect
      .poll(() => container.querySelectorAll('a').length)
      .toBeGreaterThan(3)
    expect(
      [...container.querySelectorAll('a')].filter(
        (link) => !link.closest('[inert]')
      )
    ).toHaveLength(1)
    const { violations } = await axe.run(container, {
      runOnly: ['aria-hidden-focus']
    })
    expect(violations.map(({ id }) => id)).toEqual([])
  })
})
