import { cleanup, render } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  onTestFinished
} from 'vitest'
import { commands } from 'vitest/browser'

import { getImageFadeScript } from '@oztix/roadie-core/image'

import { Image } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

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

describe('a server-rendered blur Image, before hydration', () => {
  let removeStylesheet = () => {}
  beforeAll(() => {
    removeStylesheet = useStylesheet(roadieCss)
  })
  afterAll(() => removeStylesheet())
  afterEach(() => document.documentElement.removeAttribute('data-image-fade'))

  // Server HTML only: nothing here hydrates, so React never sees a load.
  async function serverRender(src: string) {
    await commands.holdImage(src)
    const container = document.createElement('div')
    container.innerHTML = renderToString(
      <Image
        src={src}
        alt='Hero'
        width={600}
        height={300}
        priority
        placeholder='blur'
        blurDataURL={PIXEL}
      />
    )
    document.body.append(container)
    onTestFinished(() => container.remove())
    return container.querySelector('img')!
  }

  const opacity = (img: HTMLImageElement) =>
    Number(getComputedStyle(img).opacity)

  it('waits hidden on its blur, then fades in once its bytes arrive', async () => {
    new Function(getImageFadeScript())()
    const src = `https://roadie.test/fade-${crypto.randomUUID()}.gif`
    const img = await serverRender(src)

    await nextFrame()
    expect(img.complete).toBe(false)
    expect(opacity(img)).toBe(0)

    await commands.releaseImage(src)
    await expect.poll(() => img.hasAttribute('data-loaded')).toBe(true)
    const fade = img
      .getAnimations()
      .find(
        (animation) =>
          animation instanceof CSSTransition &&
          animation.transitionProperty === 'opacity'
      )
    expect(fade).toBeDefined()
    fade!.finish()
    expect(opacity(img)).toBe(1)
  })

  it('shows an image that loaded before the fade script ran', async () => {
    // A fresh document, so no fade-script listener from an earlier test sees the load.
    const frame = document.createElement('iframe')
    document.body.append(frame)
    onTestFinished(() => frame.remove())
    const page = frame.contentWindow as typeof window
    page.document.head.innerHTML = `<style>${roadieCss}</style>`
    page.document.body.innerHTML = renderToString(
      <Image
        src={PIXEL}
        alt='Hero'
        width={600}
        height={300}
        priority
        placeholder='blur'
        blurDataURL={PIXEL}
      />
    )
    const img = page.document.querySelector('img')!
    await expect.poll(() => img.complete).toBe(true)

    new page.Function(getImageFadeScript())()

    for (const animation of img.getAnimations()) animation.finish()
    expect(Number(page.getComputedStyle(img).opacity)).toBe(1)
  })

  it('shows at once without the fade script', async () => {
    const src = `https://roadie.test/plain-${crypto.randomUUID()}.gif`
    const img = await serverRender(src)

    await nextFrame()
    expect(img.complete).toBe(false)
    expect(opacity(img)).toBe(1)
    await commands.releaseImage(src)
  })
})
