import type { ComponentType } from 'react'
import { act } from 'react'

import { cleanup, render, screen } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { commands, page } from 'vitest/browser'

import { Hero } from '.'
import { BlocksProvider } from '../Provider'
import {
  DESKTOP,
  PHONE,
  atWidth,
  axeViolations,
  photo,
  textAlignOf,
  widths,
  withBrowserPage
} from '../_test/browser'
import {
  MINIMUM_FILL_LC,
  MINIMUM_LC,
  MODES,
  fillContrast,
  setMode,
  textContrast
} from '../_test/contrast'
import { describeBlockFrame } from '../_test/frame'
import { bento, imageHero, partnerHero, titleOnly } from './fixtures'

withBrowserPage()

describeBlockFrame('hero', 'title', Hero as ComponentType<never>, {
  preset: 'title'
})

const panel = (slot: string) =>
  document.querySelector<HTMLElement>(`[data-slot=hero-${slot}]`)!

const box = (slot: string) => panel(slot).getBoundingClientRect()
const shown = (slot: string) => getComputedStyle(panel(slot)).display !== 'none'

const rect = (element: Element) => element.getBoundingClientRect()

function isBeside(first: Element, second: Element) {
  return rect(first).right <= rect(second).left
}

function isAbove(first: Element, second: Element) {
  return rect(first).bottom <= rect(second).top
}

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
  it('spans the title and the video across their rows with no images', async () => {
    await showAt(DESKTOP.width, <Hero {...bento(photo)} images={[]} />)

    expect(box('heading').left).toBeCloseTo(box('video').left, 0)
    expect(box('heading').right).toBeCloseTo(box('video').right, 0)
  })

  it('spans the secondary photos across the lower row with no video', async () => {
    await showAt(DESKTOP.width, <Hero {...bento(photo)} video={undefined} />)

    expect(box('secondary').left).toBeCloseTo(box('heading').left, 0)
    expect(box('secondary').right).toBeCloseTo(box('primary').right, 0)
    expect(box('secondary').height).toBeGreaterThan(100)
    expect(box('secondary').width / box('secondary').height).toBeCloseTo(2, 1)
  })

  it('spans the video across the lower row with one image, which goes beside the title', async () => {
    await showAt(
      DESKTOP.width,
      <Hero {...bento(photo)} images={bento(photo).images!.slice(0, 1)} />
    )

    expect(box('video').left).toBeCloseTo(box('heading').left, 0)
    expect(box('video').right).toBeCloseTo(box('primary').right, 0)
  })
})

// Candidates labelled by width, so the one the browser picks says what `sizes` asked for.
const CANDIDATES = [100, 300, 600, 1200]

function withCandidates() {
  return (
    <BlocksProvider
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
    </BlocksProvider>
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

describe('Hero bento through hydration', () => {
  async function hydrate() {
    const ui = <Hero {...bento(photo)} />
    const container = document.createElement('div')
    container.innerHTML = renderToString(ui)
    document.body.append(container)
    onTestFinished(() => container.remove())
    const root = await act(async () => hydrateRoot(container, ui))
    onTestFinished(() => act(() => root.unmount()))
    // A few frames, so any effect the server render scheduled has run.
    for (let frame = 0; frame < 5; frame++)
      await new Promise(requestAnimationFrame)
    return container
  }

  it('never starts the video, and keeps its poster and first photos, for viewers who reduce motion', async () => {
    await commands.reducedMotion(true)
    await atWidth(DESKTOP.width, DESKTOP.height)
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play')
    onTestFinished(() => play.mockRestore())

    const container = await hydrate()

    expect(play).not.toHaveBeenCalled()
    expect(
      container.querySelector('[data-slot=hero-video-poster]')
    ).not.toHaveAttribute('hidden')
    expect(
      container.querySelectorAll('[data-slot=hero-primary] img')
    ).toHaveLength(1)
    expect(
      container.querySelector('button')!.getAttribute('aria-label')
    ).toMatch(/play/i)
  })

  it('starts moving once the client confirms motion is welcome', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined)
    onTestFinished(() => play.mockRestore())

    const container = await hydrate()

    expect(play).toHaveBeenCalled()
    expect(
      container.querySelector('button')!.getAttribute('aria-label')
    ).toMatch(/pause/i)
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
      .not.toHaveAttribute('aria-pressed')
  })

  it('hides the pause control on a phone when only the hidden photos move', async () => {
    await showAt(PHONE.width, <Hero {...bento(photo)} video={undefined} />)

    await expect
      .element(
        page.getByRole('button', { name: /pause/i, includeHidden: true })
      )
      .not.toBeVisible()
  })

  it('hides the pause control until the cycling title-panel photos show', async () => {
    const props = bento(photo)
    const images = props.images!.slice(0, 3)
    await showAt(640, <Hero {...props} video={undefined} images={images} />)

    await expect
      .element(
        page.getByRole('button', { name: /pause/i, includeHidden: true })
      )
      .not.toBeVisible()
  })

  it('shows the pause control once the moving photos show', async () => {
    await showAt(DESKTOP.width, <Hero {...bento(photo)} video={undefined} />)

    await expect
      .element(page.getByRole('button', { name: /pause/i }))
      .toBeVisible()
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

  // A white panel stands in for the brightest photo, since a photo has no fill to measure.
  function overWhitePhoto() {
    panel('heading').style.backgroundColor = '#fff'
    return document.querySelector('[data-slot=hero-scrim] p')!
  }

  it('tints the photo without blurring it, dark enough for body text over a white photo', async () => {
    await showAt(DESKTOP.width)
    const scrim = document.querySelector<HTMLElement>('[data-slot=hero-scrim]')!

    expect(getComputedStyle(scrim).backdropFilter).toBe('none')
    expect(textContrast(overWhitePhoto())).toBeGreaterThanOrEqual(75)
  })

  it.each([
    'neutral',
    'brand',
    'brand-secondary',
    'brand-purple',
    'accent',
    'info',
    'success',
    'warning',
    'danger'
  ] as const)(
    'keeps body text readable over a white photo under the %s tint, in both themes',
    async (intent) => {
      await showAt(DESKTOP.width, <Hero {...bento(photo)} intent={intent} />)
      const text = overWhitePhoto()

      for (const mode of MODES) {
        setMode(mode)
        expect(getComputedStyle(panel('heading')).backgroundColor, mode).toBe(
          'rgb(255, 255, 255)'
        )
        expect(textContrast(text), mode).toBeGreaterThanOrEqual(75)
      }
      setMode('light')
    }
  )

  it.each([
    'neutral',
    'brand',
    'brand-secondary',
    'brand-purple',
    'accent',
    'info',
    'success',
    'warning',
    'danger'
  ] as const)(
    'fills the strong action so it stands out from the %s tint over a white photo, in both themes',
    async (intent) => {
      await showAt(DESKTOP.width, <Hero {...bento(photo)} intent={intent} />)
      overWhitePhoto()
      const scrim = document.querySelector('[data-slot=hero-scrim]')!
      const action = page.getByRole('link', { name: 'Talk to us' }).element()

      for (const mode of MODES) {
        setMode(mode)
        expect(fillContrast(action, scrim), mode).toBeGreaterThanOrEqual(
          MINIMUM_FILL_LC
        )
      }
      setMode('light')
    }
  )
})

function colourOf(value: string) {
  const probe = document.createElement('span')
  probe.style.color = value
  document.body.append(probe)
  const colour = getComputedStyle(probe).color
  probe.remove()
  return colour
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

  it('sets the photo above the text on a phone, cropped to 2:1', async () => {
    await showAt(PHONE.width, <Hero {...imageHero(photo)} />)
    const { title, photo: image } = parts()

    expect(image.bottom).toBeLessThanOrEqual(title.top)
    expect(image.width / image.height).toBeCloseTo(2, 1)
  })

  it.each([
    ['story', 9 / 16],
    ['portrait', 3 / 4],
    ['square', 1],
    ['landscape', 3 / 2]
  ] as const)(
    'crops the photo to its %s ratio on a desktop',
    async (ratio, expected) => {
      await showAt(DESKTOP.width, <Hero {...imageHero(photo)} ratio={ratio} />)

      const { photo: image } = parts()
      expect(image.width / image.height).toBeCloseTo(expected, 1)
    }
  )

  it('sets the text beside the photo on a desktop, in about two fifths', async () => {
    await showAt(DESKTOP.width, <Hero {...imageHero(photo)} />)
    const { title, photo: image } = parts()

    expect(title.right).toBeLessThan(image.left)
    expect(image.width / (title.width + image.width)).toBeCloseTo(0.6, 1)
    expect(image.width / image.height).toBeCloseTo(2, 1)
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

describe('Hero partner layout', () => {
  const lockup = () => screen.getByRole('img', { name: 'Partner logo' })
  const heading = () => screen.getByRole('heading', { level: 1 })

  it('sets the partner lockup beside the title on wide screens, and above it on phones', async () => {
    await showAt(DESKTOP.width, <Hero {...partnerHero(photo)} />)
    expect(isBeside(lockup(), heading())).toBe(true)

    cleanup()
    await showAt(PHONE.width, <Hero {...partnerHero(photo)} />)
    expect(isAbove(lockup(), heading())).toBe(true)
  })

  it('sets the lockup beside the title at 640px', async () => {
    await showAt(640, <Hero {...partnerHero(photo)} />)

    expect(isBeside(lockup(), heading())).toBe(true)
  })

  it('overlaps the heart on both logos, centred between them', async () => {
    const { container } = await showAt(
      DESKTOP.width,
      <Hero {...partnerHero(photo)} />
    )

    const oztix = rect(screen.getByRole('img', { name: 'Oztix' }))
    const partner = rect(lockup())
    const heart = rect(
      [...container.querySelectorAll('svg')].find(
        (svg) => !svg.closest('[role="img"]')
      )!
    )
    expect(heart.top).toBeLessThan(oztix.bottom)
    expect(heart.bottom).toBeGreaterThan(partner.top)
    expect(oztix.height).toBeCloseTo(partner.height, 0)
    expect((heart.left + heart.right) / 2).toBeCloseTo(
      (partner.left + partner.right) / 2,
      0
    )
  })

  it('splits in halves at 1440px: the lockup centred in the left, the title from the middle', async () => {
    const { container } = await showAt(1440, <Hero {...partnerHero(photo)} />)

    const section = rect(container.querySelector('section')!)
    const middle = section.left + section.width / 2
    const oztix = rect(screen.getByRole('img', { name: 'Oztix' }))
    const title = rect(heading())

    expect(title.left).toBeGreaterThanOrEqual(middle)
    expect(title.left).toBeLessThan(middle + 64)
    const lockupMiddle = (oztix.left + oztix.right) / 2
    expect(Math.abs(lockupMiddle - (section.left + middle) / 2)).toBeLessThan(
      48
    )
    expect(oztix.height).toBeCloseTo(60, -1)
    expect(rect(lockup()).height).toBeCloseTo(oztix.height, 0)
  })

  it('keeps a long unbroken word inside the block at 640px', async () => {
    const { container } = await showAt(
      640,
      <Hero {...partnerHero(photo)} body={<p>{'ticketing'.repeat(20)}</p>} />
    )

    const section = container.querySelector('section')!
    expect(section.scrollWidth).toBeLessThanOrEqual(section.clientWidth)
  })
})

describe('Hero align', () => {
  const heading = () => screen.getByRole('heading', { level: 1 })

  it.each([
    ['image', imageHero(photo)],
    ['title', titleOnly],
    ['partner', partnerHero(photo)]
  ] as const)(
    'starts the %s text by default, and centres it when asked',
    async (_, props) => {
      await showAt(DESKTOP.width, <Hero {...props} />)
      expect(textAlignOf(heading())).toBe('start')

      cleanup()
      await showAt(DESKTOP.width, <Hero {...props} align='center' />)
      expect(textAlignOf(heading())).toBe('center')
    }
  )

  it('centres the bento title over its photo when asked', async () => {
    await showAt(DESKTOP.width, <Hero {...bento(photo)} align='center' />)

    expect(textAlignOf(heading())).toBe('center')
  })
})

describe('Hero size', () => {
  it.each([
    ['bento', bento(photo)],
    ['image', imageHero(photo)],
    ['title', titleOnly],
    ['partner', partnerHero(photo)]
  ] as const)(
    'sets the %s title smaller at md, and again at sm',
    async (_, props) => {
      await showAt(DESKTOP.width, <Hero {...props} />)
      const large = parseFloat(
        getComputedStyle(document.querySelector('h1')!).fontSize
      )

      cleanup()
      await showAt(DESKTOP.width, <Hero {...props} size='md' />)
      const medium = parseFloat(
        getComputedStyle(document.querySelector('h1')!).fontSize
      )
      expect(medium).toBeLessThan(large)

      cleanup()
      await showAt(DESKTOP.width, <Hero {...props} size='sm' />)
      expect(
        parseFloat(getComputedStyle(document.querySelector('h1')!).fontSize)
      ).toBeLessThan(medium)
    }
  )
})

describe('Hero size, beyond the title', () => {
  const fontSize = (element: Element) =>
    parseFloat(getComputedStyle(element).fontSize)

  it.each([
    ['bento', bento(photo)],
    ['image', imageHero(photo)],
    ['partner', partnerHero(photo)]
  ] as const)(
    'sets the %s description smaller at md, and again at sm',
    async (_, props) => {
      const description = () => screen.getByText(props.description!)
      await showAt(DESKTOP.width, <Hero {...props} />)
      const large = fontSize(description())

      cleanup()
      await showAt(DESKTOP.width, <Hero {...props} size='md' />)
      const medium = fontSize(description())
      expect(medium).toBeLessThan(large)

      cleanup()
      await showAt(DESKTOP.width, <Hero {...props} size='sm' />)
      expect(fontSize(description())).toBeLessThan(medium)
    }
  )

  it('sets the partner body smaller at sm', async () => {
    const body = () => screen.getByText(/safest way to resell/)
    await showAt(DESKTOP.width, <Hero {...partnerHero(photo)} />)
    const large = fontSize(body())

    cleanup()
    await showAt(DESKTOP.width, <Hero {...partnerHero(photo)} size='sm' />)
    expect(fontSize(body())).toBeLessThan(large)
  })

  it('gives the image photo a smaller share of the width at md, and again at sm', async () => {
    const share = () => {
      const title = document.querySelector('h1')!.parentElement!
      const image = document.querySelector('img')!
      const photoWidth = rect(image).width
      return photoWidth / (rect(title).width + photoWidth)
    }
    await showAt(DESKTOP.width, <Hero {...imageHero(photo)} />)
    const large = share()

    cleanup()
    await showAt(DESKTOP.width, <Hero {...imageHero(photo)} size='md' />)
    const medium = share()
    expect(medium).toBeLessThan(large - 0.05)

    cleanup()
    await showAt(DESKTOP.width, <Hero {...imageHero(photo)} size='sm' />)
    expect(share()).toBeLessThan(medium - 0.05)
  })

  it('keeps the image photo at its ratio at every size', async () => {
    await showAt(DESKTOP.width, <Hero {...imageHero(photo)} size='sm' />)
    const image = rect(document.querySelector('img')!)

    expect(image.width / image.height).toBeCloseTo(2, 1)
  })
})

describe.each(MODES)('Hero contrast in %s mode', (mode) => {
  it.each([
    ['image', imageHero(photo)],
    ['title', titleOnly],
    ['partner', partnerHero(photo)]
  ] as const)(
    'keeps the %s title and description readable',
    async (_, props) => {
      setMode(mode)
      onTestFinished(() => setMode('light'))
      await showAt(DESKTOP.width, <Hero {...props} />)

      expect(
        textContrast(document.querySelector('h1')!)
      ).toBeGreaterThanOrEqual(MINIMUM_LC.large)
      if (props.description)
        expect(
          textContrast(screen.getByText(props.description))
        ).toBeGreaterThanOrEqual(MINIMUM_LC.body)
    }
  )
})

describe.each([
  ['bento', bento(photo)],
  ['image', imageHero(photo)],
  ['title', titleOnly],
  ['partner', partnerHero(photo)]
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
