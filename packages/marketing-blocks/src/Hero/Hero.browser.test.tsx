import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { commands, page } from 'vitest/browser'

import { Hero } from '.'
import { MarketingBlocksProvider } from '../Provider'
import {
  DESKTOP,
  PHONE,
  atWidth,
  axeViolations,
  photo,
  widths,
  withBrowserPage
} from '../_test/browser'
import { bento, imageHero, titleOnly } from './fixtures'

withBrowserPage()

const panel = (slot: string) =>
  document.querySelector<HTMLElement>(`[data-slot=hero-${slot}]`)!

const box = (slot: string) => panel(slot).getBoundingClientRect()
const shown = (slot: string) => getComputedStyle(panel(slot)).display !== 'none'

async function showAt(width: number, ui = <Hero {...bento(photo)} />) {
  await atWidth(width, 900)
  return render(ui)
}

describe('Hero bento layout', () => {
  it('stacks the title over the video on a phone, with no photo panels', async () => {
    await showAt(PHONE.width)

    expect(shown('primary')).toBe(false)
    expect(shown('secondary')).toBe(false)
    expect(box('video').top).toBeGreaterThanOrEqual(box('heading').bottom)
    expect(box('video').width).toBeCloseTo(box('heading').width, 0)
  })

  it('sets the secondary photos beside the video under a full-width title at 640px', async () => {
    await showAt(640)

    expect(shown('primary')).toBe(false)
    expect(box('secondary').top).toBeCloseTo(box('video').top, 0)
    expect(box('secondary').right).toBeLessThan(box('video').left)
    expect(box('secondary').top).toBeGreaterThan(box('heading').bottom)
    expect(box('heading').width).toBeGreaterThan(
      box('video').right - box('secondary').left - 1
    )
  })

  it('puts the primary photos beside the title from 960px', async () => {
    await showAt(960)

    expect(box('primary').top).toBeCloseTo(box('heading').top, 0)
    expect(box('primary').left).toBeGreaterThan(box('heading').right)
  })

  it('puts the primary photos beside the title, and secondary beside the video, on a desktop', async () => {
    await showAt(DESKTOP.width)

    expect(box('primary').top).toBeCloseTo(box('heading').top, 0)
    expect(box('primary').left).toBeGreaterThan(box('heading').right)
    expect(box('primary').bottom).toBeCloseTo(box('heading').bottom, 0)
    expect(box('heading').width / box('primary').width).toBeCloseTo(2, 0)
    expect(box('secondary').top).toBeCloseTo(box('video').top, 0)
    expect(box('secondary').left).toBeCloseTo(box('heading').left, 0)
    expect(box('video').right).toBeCloseTo(box('primary').right, 0)
  })

  it('crops sized photos to fill each panel, whatever their own shape', async () => {
    await showAt(DESKTOP.width)

    for (const slot of ['heading', 'primary', 'secondary', 'video']) {
      const frame = panel(slot)
      const image = frame.querySelector('img')!.getBoundingClientRect()
      expect(image.width, slot).toBeCloseTo(frame.clientWidth, 0)
      expect(image.height, slot).toBeCloseTo(frame.clientHeight, 0)
    }
    expect(box('video').width / box('video').height).toBeCloseTo(16 / 9, 1)
  })

  it('keeps its title the same light colour in both themes, over the photo', async () => {
    await showAt(DESKTOP.width)
    const title = document.querySelector('h1')!
    const light = getComputedStyle(title).color

    document.documentElement.classList.add('dark')
    const dark = getComputedStyle(title).color
    document.documentElement.classList.remove('dark')

    const probe = document.createElement('span')
    probe.style.color = 'var(--color-neutral-light-0)'
    document.body.append(probe)
    expect(light).toBe(getComputedStyle(probe).color)
    expect(dark).toBe(light)
    probe.remove()
  })
})

const SLOTS = ['heading', 'primary', 'secondary', 'video']

describe('Hero bento with a panel missing', () => {
  it('spans the title across the top row with no primary photos', async () => {
    await showAt(DESKTOP.width, <Hero {...bento(photo)} primaryImages={[]} />)

    expect(box('heading').left).toBeCloseTo(box('secondary').left, 0)
    expect(box('heading').right).toBeCloseTo(box('video').right, 0)
  })

  it('spans the secondary photos across the lower row with no video', async () => {
    await showAt(DESKTOP.width, <Hero {...bento(photo)} video={undefined} />)

    expect(box('secondary').left).toBeCloseTo(box('heading').left, 0)
    expect(box('secondary').right).toBeCloseTo(box('primary').right, 0)
    expect(box('secondary').height).toBeGreaterThan(100)
  })

  it('spans the video across the lower row with no secondary photos', async () => {
    await showAt(DESKTOP.width, <Hero {...bento(photo)} secondaryImages={[]} />)

    expect(box('video').left).toBeCloseTo(box('heading').left, 0)
    expect(box('video').right).toBeCloseTo(box('primary').right, 0)
  })
})

// Candidates labelled by width, so the one the browser picks says what `sizes` asked for.
const CANDIDATES = [100, 300, 600, 1200]

function withCandidates() {
  return (
    <MarketingBlocksProvider
      renderImage={({ alt, sizes, className }) => (
        <img
          alt={alt}
          sizes={sizes}
          className={className}
          srcSet={CANDIDATES.map((w) => `/__candidate/${w}.png ${w}w`).join(
            ', '
          )}
        />
      )}
    >
      <Hero {...bento(photo)} />
    </MarketingBlocksProvider>
  )
}

describe('Hero bento image sizes', () => {
  it.each([
    [600, 'secondary'],
    [920, 'primary']
  ])(
    'asks for at least the panel’s width at %ipx, in the %s panel',
    async (width, slot) => {
      await showAt(width, withCandidates())
      const img = panel(slot).querySelector('img')!

      await expect.poll(() => img.currentSrc).not.toBe('')
      const chosen = Number(/(\d+)\.png/.exec(img.currentSrc)![1])
      expect(chosen).toBeGreaterThanOrEqual(panel(slot).clientWidth)
    }
  )
})

describe('Hero bento video poster', () => {
  it('shows the poster over the video for viewers who reduce motion', async () => {
    await commands.reducedMotion(true)
    await showAt(DESKTOP.width)
    const frame = box('video')

    const top = document.elementFromPoint(
      frame.left + frame.width / 2,
      frame.top + frame.height / 2
    )!
    expect(
      top.closest('[data-slot=hero-video-poster]'),
      top.outerHTML
    ).not.toBeNull()
  })
})

describe('Hero bento pause toggle', () => {
  it('shows a pause control over the bento that turns to play when pressed', async () => {
    await showAt(PHONE.width)
    const button = page.getByRole('button', { name: /pause/i })
    await expect.element(button).toBeVisible()

    await button.click()
    await expect
      .element(page.getByRole('button', { name: /play/i }))
      .toHaveAttribute('aria-pressed', 'true')
  })

  it('starts on play for viewers who reduce motion', async () => {
    await commands.reducedMotion(true)
    await showAt(DESKTOP.width)

    await expect
      .element(page.getByRole('button', { name: /play/i }))
      .toBeVisible()
  })
})

describe('Hero bento frames and scrim', () => {
  it.each([
    [PHONE.width, '4px'],
    [640, '6px'],
    [DESKTOP.width, '8px']
  ])('frames each panel in fixed white at %ipx', async (width, border) => {
    await showAt(width)
    document.documentElement.classList.add('dark')
    const white = colourOf('var(--color-neutral-light-0)')

    for (const slot of SLOTS.filter(shown)) {
      const style = getComputedStyle(panel(slot))
      expect(style.borderTopWidth, slot).toBe(border)
      expect(style.borderTopColor, slot).toBe(white)
    }
    document.documentElement.classList.remove('dark')
  })

  it('tints the photo without blurring it, dark enough for body text over a white photo', async () => {
    await showAt(DESKTOP.width)
    const scrim = document.querySelector<HTMLElement>('[data-slot=hero-scrim]')!
    const style = getComputedStyle(scrim)

    expect(style.backdropFilter).toBe('none')
    expect(
      Math.abs(apcaLc([255, 255, 255], flattenOverWhite(style.backgroundColor)))
    ).toBeGreaterThanOrEqual(75)
  })
})

function colourOf(value: string) {
  const probe = document.createElement('span')
  probe.style.color = value
  document.body.append(probe)
  const colour = getComputedStyle(probe).color
  probe.remove()
  return colour
}

type Rgb = [number, number, number]

// Paints the colour over white and reads back sRGB, so oklch and alpha resolve.
function flattenOverWhite(colour: string): Rgb {
  const context = Object.assign(document.createElement('canvas'), {
    width: 1,
    height: 1
  }).getContext('2d')!
  context.fillStyle = '#fff'
  context.fillRect(0, 0, 1, 1)
  context.fillStyle = colour
  context.fillRect(0, 0, 1, 1)
  const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data
  return [r, g, b]
}

// APCA-W3 0.0.98G, as in packages/components/src/css/contrastTestUtils.ts.
function apcaLc(text: Rgb, background: Rgb) {
  const screenY = ([r, g, b]: Rgb) => {
    const y =
      0.2126729 * (r / 255) ** 2.4 +
      0.7151522 * (g / 255) ** 2.4 +
      0.072175 * (b / 255) ** 2.4
    return y < 0.022 ? y + (0.022 - y) ** 1.414 : y
  }
  const textY = screenY(text)
  const backgroundY = screenY(background)
  if (backgroundY > textY)
    return ((backgroundY ** 0.56 - textY ** 0.57) * 1.14 - 0.027) * 100
  return ((backgroundY ** 0.65 - textY ** 0.62) * 1.14 + 0.027) * 100
}

describe('Hero image layout', () => {
  const parts = () => ({
    title: document.querySelector('h1')!.parentElement!.getBoundingClientRect(),
    photo: document.querySelector('img')!.getBoundingClientRect()
  })

  it('sets the text beside the photo at 640px, in halves', async () => {
    await showAt(640, <Hero {...imageHero(photo)} />)
    const { title, photo: image } = parts()

    expect(title.right).toBeLessThan(image.left)
    expect(image.top).toBeLessThan(title.bottom)
    expect(image.width / (title.width + image.width)).toBeCloseTo(0.5, 1)
  })

  it('sets the photo above the text on a phone, at its own shape', async () => {
    await showAt(PHONE.width, <Hero {...imageHero(photo)} />)
    const { title, photo: image } = parts()

    expect(image.bottom).toBeLessThanOrEqual(title.top)
    expect(image.width / image.height).toBeCloseTo(1200 / 800, 1)
  })

  it('sets the text beside the photo on a desktop, in about two fifths', async () => {
    await showAt(DESKTOP.width, <Hero {...imageHero(photo)} />)
    const { title, photo: image } = parts()

    expect(title.right).toBeLessThan(image.left)
    expect(image.width / (title.width + image.width)).toBeCloseTo(0.6, 1)
    expect(image.width / image.height).toBeCloseTo(1200 / 800, 1)
  })
})

describe('Hero title layout', () => {
  it('starts its title at the page edge and holds it to a readable width', async () => {
    await showAt(1920, <Hero {...titleOnly} />)

    const title = document.querySelector('h1')!
    expect(title.getBoundingClientRect().width).toBeLessThanOrEqual(1024)
    expect(getComputedStyle(title).textAlign).toBe('start')
  })
})

describe.each([
  ['bento', bento(photo)],
  ['image', imageHero(photo)],
  ['title', titleOnly]
])('Hero %s accessibility', (_, props) => {
  it.each(widths)(
    'has no axe violations on a $name',
    async ({ width, height }) => {
      await atWidth(width, height)
      const { container } = render(<Hero {...props} />)

      expect(await axeViolations(container)).toEqual([])
    }
  )
})
