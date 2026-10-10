import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Image } from '.'

afterEach(() => cleanup())

const PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='

const nextFrame = () =>
  new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

describe('a deferred Image', () => {
  it('withholds its source until it nears the viewport', async () => {
    const { container } = render(
      <div>
        <div style={{ height: innerHeight + 600 }} />
        <Image src={PIXEL} alt='Logo' width={600} height={300} defer />
      </div>
    )
    const img = container.querySelector('img')!
    await nextFrame()
    await nextFrame()
    expect(img).not.toHaveAttribute('src')

    img.scrollIntoView()
    await expect.poll(() => img.getAttribute('src')).toBe(PIXEL)
  })
})
