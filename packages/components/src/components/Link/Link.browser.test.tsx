import { cleanup, render, screen } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  onTestFinished
} from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'

import { Link, type LinkProps } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { setHoverCapable } from '../../css/testUtils'
import { pointAt } from '../../utils/pointerTestUtils'
import { Callout } from '../Callout'
import { useStylesheet } from '../Pane/testUtils'

const STILL = '*, *::before, *::after { transition: none !important }'

let removeRoadie = () => {}
let removeStill = () => {}
beforeAll(() => {
  removeRoadie = useStylesheet(roadieCss)
  removeStill = useStylesheet(STILL)
})
afterAll(() => {
  removeStill()
  removeRoadie()
})
afterEach(async () => {
  setHoverCapable(true)
  await userEvent.unhover(document.body)
  cleanup()
})

const frame = () =>
  new Promise((resolve) => requestAnimationFrame(() => resolve(null)))

// Resolves a colour token the way the browser computes it, for comparison.
function tokenColor(token: string) {
  const probe = document.createElement('span')
  probe.style.color = token.startsWith('--') ? `var(${token})` : token
  document.body.append(probe)
  const color = getComputedStyle(probe).color
  probe.remove()
  return color
}

const TRANSPARENT = 'rgba(0, 0, 0, 0)'

async function capture(element: HTMLElement) {
  const base64 = await page.screenshot({ element, save: false })
  const image = new Image()
  image.src = `data:image/png;base64,${base64}`
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const context = canvas.getContext('2d')!
  context.drawImage(image, 0, 0)
  const box = element.getBoundingClientRect()
  const scale = image.width / box.width
  return (x: number, y: number) =>
    [
      ...context.getImageData(
        Math.round((x - box.left) * scale),
        Math.round((y - box.top) * scale),
        1,
        1
      ).data
    ].slice(0, 3)
}

const luminance = ([r, g, b]: number[]) =>
  0.2126 * r! + 0.7152 * g! + 0.0722 * b!

// A paused transition reports its colour in another space, so compare what paints.
function paint(color: string) {
  return pixel(color).slice(0, 3)
}

function pixel(color: string) {
  const context = document.createElement('canvas').getContext('2d')!
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)
  return [...context.getImageData(0, 0, 1, 1).data]
}

function look(element: Element) {
  const style = getComputedStyle(element)
  return {
    color: style.color,
    image: style.backgroundImage,
    size: style.backgroundSize,
    position: style.backgroundPosition,
    line: style.textDecorationLine,
    underline: style.textDecorationColor,
    thickness: style.textDecorationThickness,
    offset: style.textUnderlineOffset
  }
}

// The colour of each gradient layer: the underline first, then the fill.
function layerColors(element: Element) {
  const image = getComputedStyle(element).backgroundImage
  const colors: string[] = []
  let depth = 0
  let start = -1
  for (let i = 0; i < image.length; i++) {
    if (image.startsWith('linear-gradient(', i) && depth === 0) {
      start = i + 'linear-gradient('.length
      depth = 1
      i = start - 1
      continue
    }
    if (image[i] === '(') depth++
    if (image[i] === ')') depth--
    if (depth === 1 && image[i] === ',' && start >= 0) {
      colors.push(image.slice(start, i).trim())
      start = -1
    }
    if (depth === 0) start = -1
  }
  return colors
}

// normal draws [underline, fill]; strong draws [ink on the fill, resting ink,
// underline, fill], its inks clipped to the text.
function layers(element: Element) {
  const colors = layerColors(element)
  const sizes = getComputedStyle(element).backgroundSize.split(', ')
  const at = colors.length === 4 ? 2 : 0
  return {
    inkOn: colors[0],
    ink: colors[1],
    inkSize: sizes[0],
    underline: colors[at],
    underlineSize: sizes[at],
    fill: colors[at + 1]
  }
}

// What emphasis-strong paints in the given intent, to compare a strong link's fill with.
function emphasisStrong(intent: string) {
  const probe = document.createElement('span')
  probe.className = `emphasis-strong ${intent}`
  document.body.append(probe)
  const { backgroundColor, color } = getComputedStyle(probe)
  probe.remove()
  return { fill: backgroundColor, text: color }
}

const FULL_LESS_LINE = /^100% 1px, 100% calc\((100% - 1px|-1px \+ 100%)\)$/

// normal and strong draw their underline as the first background layer.
function thickness(element: Element) {
  const style = getComputedStyle(element)
  return style.textDecorationLine === 'underline'
    ? style.textDecorationThickness
    : layers(element).underlineSize!.split(' ')[1]
}

const boxDecorationBreak = (element: Element) => {
  const style = getComputedStyle(element) as CSSStyleDeclaration & {
    webkitBoxDecorationBreak?: string
  }
  return style.boxDecorationBreak || style.webkitBoxDecorationBreak
}

function renderLink(props: Partial<LinkProps> = {}) {
  render(
    <p className='text-subtle' style={{ fontSize: 16 }}>
      Doors open at 7pm for{' '}
      <Link href='#lineup' {...props}>
        Ochre Kite Weekender
      </Link>
      .
    </p>
  )
  return {
    link: screen.getByRole('link', { name: 'Ochre Kite Weekender' }),
    text: getComputedStyle(screen.getByText(/Doors open/)).color
  }
}

// Tab skips links in WebKit and in macOS Firefox by default, so focus after a key press, which still reads as keyboard focus.
async function focusByKeyboard(link: HTMLElement) {
  await userEvent.keyboard('{Shift}')
  link.focus()
  await frame()
  expect(link.matches(':focus-visible')).toBe(true)
}

async function hover(link: HTMLElement) {
  await pointAt(link)
  await frame()
}

const engagements = [
  ['hover', hover],
  ['keyboard focus', focusByKeyboard]
] as const

describe('A normal link', () => {
  it('rests with a 1/16em accent underline and the text colour', () => {
    const { link, text } = renderLink()

    expect(look(link)).toMatchObject({
      color: text,
      line: 'none',
      size: '100% 1px, 100% 0%'
    })
    expect(look(link).position).toMatch(/^0% 100%/)
    expect(layerColors(link)[0]).toBe(tokenColor('--color-accent-9'))
  })

  it.each(engagements)(
    'grows a tint up from its underline, which merges into it, on %s',
    async (_, engage) => {
      const { link, text } = renderLink()

      await engage(link)

      const [underline, fill] = layerColors(link)
      expect(look(link).color).toBe(text)
      expect(look(link).size).toMatch(FULL_LESS_LINE)
      expect(underline).toBe(fill)
    }
  )
})

describe.each([
  ['neutral', undefined, '--color-neutral-13', '--color-neutral-9'],
  ['accent', 'accent', '--color-accent-11', '--color-accent-9']
] as const)('A %s strong link', (name, intent, text, underline) => {
  it('rests in its intent’s link text with its underline and no fill', () => {
    const { link } = renderLink({ emphasis: 'strong', intent })

    expect(look(link)).toMatchObject({
      color: tokenColor(text),
      line: 'none'
    })
    expect(look(link).size).toBe('0% 100%, 100% 100%, 100% 1px, 0% 100%')
    const clip = getComputedStyle(link) as CSSStyleDeclaration & {
      webkitBackgroundClip?: string
    }
    expect(
      (clip.backgroundClip || clip.webkitBackgroundClip)!
        .split(', ')
        .slice(0, 2)
    ).toEqual(['text', 'text'])
    expect(layers(link)).toMatchObject({
      ink: tokenColor(text),
      underline: tokenColor(underline)
    })
  })

  it.each(engagements)(
    'fills from the left as emphasis-strong, merging its underline, on %s',
    async (_, engage) => {
      const { link } = renderLink({ emphasis: 'strong', intent })

      await engage(link)

      const { underline: line, fill, inkOn } = layers(link)
      expect(look(link).size).toBe('100% 100%, 100% 100%, 100% 1px, 100% 100%')
      expect(line).toBe(fill)
      expect({ fill, text: inkOn }).toEqual(emphasisStrong(`intent-${name}`))
    }
  )
})

describe('A subtle link', () => {
  it('rests with a transparent underline 6px below the text', () => {
    const { link, text } = renderLink({ emphasis: 'subtle' })

    expect(look(link)).toMatchObject({
      color: text,
      line: 'underline',
      underline: TRANSPARENT,
      offset: '6px'
    })
  })

  it.each(engagements)(
    'raises an accent underline to 2px below the text on %s',
    async (_, engage) => {
      const { link } = renderLink({ emphasis: 'subtle' })

      await engage(link)

      expect(look(link)).toMatchObject({
        underline: tokenColor('--color-accent-9'),
        offset: '2px'
      })
    }
  )
})

describe.each(['normal', 'strong', 'subtle'] as const)(
  'A %s link’s underline',
  (emphasis) => {
    it.each(engagements)(
      'is 1/16em thick at rest and on %s, as every emphasis is',
      async (_, engage) => {
        const { link } = renderLink({ emphasis })
        const rest = thickness(link)

        await engage(link)

        expect([rest, thickness(link)]).toEqual(['1px', '1px'])
      }
    )
  }
)

describe.each(['normal', 'strong', 'subtle'] as const)(
  'A %s link on a touch screen',
  (emphasis) => {
    it('keeps its resting look after a tap', async () => {
      setHoverCapable(false)
      const { link } = renderLink({ emphasis })
      const rest = look(link)

      await userEvent.hover(link)
      await frame()

      expect(link.matches(':hover')).toBe(true)
      expect(look(link)).toEqual(rest)
    })

    it('shows the focus ring on keyboard focus', async () => {
      const { link } = renderLink({ emphasis })

      await focusByKeyboard(link)

      expect(parseFloat(getComputedStyle(link).outlineWidth)).toBeGreaterThan(0)
    })
  }
)

describe('A selected strong link', () => {
  it('keeps its clipped text visible under the selection highlight', async () => {
    render(
      <p className='bg-normal' style={{ fontSize: 48, padding: 8 }}>
        <Link href='#lineup' emphasis='strong'>
          MMMMMMMM
        </Link>
      </p>
    )
    const link = screen.getByRole('link')
    await focusByKeyboard(link)
    const range = document.createRange()
    range.selectNodeContents(link)
    getSelection()!.removeAllRanges()
    getSelection()!.addRange(range)
    onTestFinished(() => getSelection()!.removeAllRanges())
    await frame()

    const box = link.getBoundingClientRect()
    const pixelAt = await capture(link)
    const seen: number[] = []
    for (let x = box.left + 4; x < box.right - 4; x += 2)
      for (let y = box.top + 4; y < box.bottom - 4; y += 2)
        seen.push(luminance(pixelAt(x, y)))

    // Letters stand apart from the highlight behind them.
    expect(Math.max(...seen) - Math.min(...seen)).toBeGreaterThan(80)
  })

  it('paints selected letters MarkText on Mark mid-sweep', async (context) => {
    if (CSS.supports('font', '-apple-system-body')) {
      context.skip()
      return
    }
    removeStill()
    onTestFinished(() => {
      removeStill = useStylesheet(STILL)
    })
    render(
      <p className='bg-normal' style={{ fontSize: 48, padding: 8 }}>
        <Link href='#lineup' emphasis='strong'>
          MMMMMMMM
        </Link>
      </p>
    )
    const link = screen.getByRole('link')
    await hover(link)
    for (const animation of link.getAnimations()) {
      animation.pause()
      const { delay, duration } = animation.effect!.getTiming()
      animation.currentTime = delay! + Number(duration) * 0.12
    }
    const range = document.createRange()
    range.selectNodeContents(link)
    getSelection()!.removeAllRanges()
    getSelection()!.addRange(range)
    onTestFinished(() => getSelection()!.removeAllRanges())
    await frame()

    const box = link.getBoundingClientRect()
    const pixelAt = await capture(link)
    const mark = paint(tokenColor('Mark'))
    const markText = paint(tokenColor('MarkText'))
    const near = (a: number[], b: number[]) =>
      a.every((channel, index) => Math.abs(channel - b[index]!) < 40)
    const seen: number[][] = []
    for (let x = box.left + 4; x < box.right - 4; x += 2)
      for (let y = box.top + 4; y < box.bottom - 4; y += 2)
        seen.push(pixelAt(x, y))

    expect(seen.some((rgb) => near(rgb, mark))).toBe(true)
    expect(seen.some((rgb) => near(rgb, markText))).toBe(true)
  })
})

describe('A neutral strong link in dark mode', () => {
  it('underlines with the strong border colour', () => {
    document.documentElement.classList.add('dark')
    onTestFinished(() => document.documentElement.classList.remove('dark'))
    const { link } = renderLink({ emphasis: 'strong' })
    const border = document.createElement('span')
    border.className = 'border border-strong'
    document.body.append(border)
    onTestFinished(() => border.remove())

    expect(layers(link).underline).toBe(getComputedStyle(border).borderTopColor)
  })
})

describe('A strong link’s real text', () => {
  const fill = (link: Element) => getComputedStyle(link).webkitTextFillColor
  const textFill = (link: Element) =>
    link
      .getAnimations()
      .find(
        (animation) =>
          (animation as CSSTransition).transitionProperty ===
          '-webkit-text-fill-color'
      )

  function live() {
    removeStill()
    onTestFinished(() => {
      removeStill = useStylesheet(STILL)
    })
  }

  it('is plain text at rest, so find and selection stay native', () => {
    const { link } = renderLink({ emphasis: 'strong' })

    expect(fill(link)).toBe(getComputedStyle(link).color)
  })

  it.each(engagements)(
    'gives way to the clipped ink on %s',
    async (_, engage) => {
      const { link } = renderLink({ emphasis: 'strong' })

      await engage(link)

      expect(pixel(fill(link))[3]).toBe(0)
    }
  )

  it('comes back only once the sweep has reversed', async () => {
    live()
    const { link } = renderLink({ emphasis: 'strong' })
    await hover(link)
    for (const animation of link.getAnimations()) animation.finish()

    await userEvent.unhover(link)
    await frame()

    expect(pixel(fill(link))[3]).toBe(0)
    const back = textFill(link)!
    expect(back.effect!.getTiming().delay).toBeCloseTo(300, -1)
    back.finish()
    expect(pixel(fill(link))).toEqual(pixel(getComputedStyle(link).color))
  })

  it('stays clipped through a quick hover out and back', async () => {
    live()
    const { link } = renderLink({ emphasis: 'strong' })
    await hover(link)
    for (const animation of link.getAnimations()) animation.finish()

    await userEvent.unhover(link)
    await frame()
    await hover(link)
    for (const animation of link.getAnimations()) animation.finish()

    expect(pixel(fill(link))[3]).toBe(0)
  })

  const pseudos = () =>
    CSS.supports('selector(::search-text)')
      ? ['::selection', '::target-text', '::search-text']
      : ['::selection', '::target-text']
  const highlight = (element: Element, pseudo: string) => {
    const style = getComputedStyle(element, pseudo)
    return { background: style.backgroundColor, text: style.color }
  }

  it('leaves selection, fragment and find highlights native at rest', () => {
    const { link } = renderLink({ emphasis: 'strong' })
    const plain = document.createElement('span')
    plain.textContent = 'Line-up'
    document.body.append(plain)
    onTestFinished(() => plain.remove())

    for (const pseudo of pseudos())
      expect(highlight(link, pseudo).background).toBe(
        highlight(plain, pseudo).background
      )
  })

  it.each(engagements)(
    'paints selection, fragment and find highlights in Mark on %s',
    async (_, engage) => {
      const { link } = renderLink({ emphasis: 'strong' })

      await engage(link)

      // WebKit blends its highlights over the clipped ink and keeps its own.
      if (CSS.supports('font', '-apple-system-body')) return
      for (const pseudo of pseudos())
        expect(highlight(link, pseudo)).toEqual({
          background: tokenColor('Mark'),
          text: tokenColor('MarkText')
        })
    }
  )
})

describe('A strong link in forced colours', () => {
  it('drops its layers for plain, underlined system-coloured text', async (context) => {
    await commands.forcedColors(true)
    onTestFinished(() => commands.forcedColors(false))
    if (!matchMedia('(forced-colors: active)').matches) {
      context.skip()
      return
    }
    const { link } = renderLink({ emphasis: 'strong' })
    const style = getComputedStyle(link)

    expect(style.backgroundImage).toBe('none')
    expect(style.textDecorationLine).toBe('underline')
    expect(style.webkitTextFillColor).toBe(tokenColor('LinkText'))
  })
})

describe('A normal link in forced colours', () => {
  // Forced colours drop gradient backgrounds, which is where its underline is drawn.
  it.for([
    ['a normal Link', () => renderLink().link],
    [
      'a .prose link',
      () => {
        render(
          <div className='prose'>
            <p>
              <a href='#prose'>Prose link</a>
            </p>
          </div>
        )
        return screen.getByRole('link')
      }
    ]
  ] as const)('keeps %s underlined', async ([, mount], context) => {
    await commands.forcedColors(true)
    onTestFinished(() => commands.forcedColors(false))
    if (!matchMedia('(forced-colors: active)').matches) {
      context.skip()
      return
    }
    const link = mount()

    expect(getComputedStyle(link).textDecorationLine).toBe('underline')
  })
})

describe('A link that wraps', () => {
  it.each(['normal', 'strong'] as const)(
    'paints a %s background on every line',
    (emphasis) => {
      render(
        <p style={{ width: 120, fontSize: 16 }}>
          <Link href='#lineup' emphasis={emphasis}>
            Kelpie Moon Festival of Bonfires
          </Link>
        </p>
      )
      const link = screen.getByRole('link')

      expect(link.getClientRects().length).toBeGreaterThanOrEqual(2)
      expect(boxDecorationBreak(link)).toBe('clone')
    }
  )
})

describe('Link intent', () => {
  function renderInDanger(props: Partial<LinkProps>) {
    render(
      <Callout intent='danger'>
        <Callout.Description>
          Try another card, or{' '}
          <Link href='#bank' {...props}>
            contact your bank
          </Link>
          .
        </Callout.Description>
      </Callout>
    )
    return screen.getByRole('link')
  }

  it('keeps a normal link accent inside a danger surface', () => {
    const link = renderInDanger({})

    expect(layerColors(link)[0]).toBe(tokenColor('--color-accent-9'))
  })

  it('keeps a subtle link accent inside a danger surface', async () => {
    const link = renderInDanger({ emphasis: 'subtle' })

    await focusByKeyboard(link)

    expect(look(link).underline).toBe(tokenColor('--color-accent-9'))
  })

  it('colours a normal link from its own intent', () => {
    const { link } = renderLink({ intent: 'danger' })

    expect(layerColors(link)[0]).toBe(tokenColor('--color-danger-9'))
  })

  it('colours a subtle link from its own intent', async () => {
    const { link } = renderLink({ intent: 'danger', emphasis: 'subtle' })

    await focusByKeyboard(link)

    expect(look(link).underline).toBe(tokenColor('--color-danger-9'))
  })

  it('colours a strong link from its own intent', () => {
    const { link } = renderLink({ intent: 'danger', emphasis: 'strong' })

    expect(look(link).color).toBe(tokenColor('--color-danger-11'))
  })

  it('colours a strong link from the surrounding intent', () => {
    const link = renderInDanger({ emphasis: 'strong' })

    expect(look(link).color).toBe(tokenColor('--color-danger-11'))
    expect(layers(link).underline).toBe(tokenColor('--color-danger-9'))
  })

  it.each([
    ['inside a danger surface', () => renderInDanger({ emphasis: 'strong' })],
    [
      'with its own danger intent',
      () => renderLink({ emphasis: 'strong', intent: 'danger' }).link
    ]
  ])('fills a strong link %s as a danger emphasis-strong', async (_, mount) => {
    const link = mount()

    await hover(link)

    const { fill, inkOn } = layers(link)
    expect({ fill, text: inkOn }).toEqual(emphasisStrong('intent-danger'))
  })
})

describe('Link motion', () => {
  const durations = (link: Element) => {
    const style = getComputedStyle(link)
    const properties = style.transitionProperty.split(', ')
    const times = style.transitionDuration.split(', ')
    return Object.fromEntries(
      properties.map((property, index) => [
        property,
        parseFloat(times[index % times.length]!)
      ])
    )
  }

  const delays = (link: Element) => {
    const style = getComputedStyle(link)
    const properties = style.transitionProperty.split(', ')
    const times = style.transitionDelay.split(', ')
    return Object.fromEntries(
      properties.map((property, index) => [
        property,
        parseFloat(times[index % times.length]!)
      ])
    )
  }

  it('waits 50ms before a strong link sweeps on hover, but not on focus or leave', async () => {
    withoutStill()
    const { link } = renderLink({ emphasis: 'strong' })
    const sweep = (state: Record<string, number>) => [
      state['background-size'],
      state['--link-underline']
    ]

    expect(sweep(delays(link))).toEqual([0, 0])
    await hover(link)
    expect(sweep(delays(link))).toEqual([0.05, 0.05])
    await userEvent.unhover(link)
    await focusByKeyboard(link)
    expect(sweep(delays(link))).toEqual([0, 0])
  })

  function withoutStill() {
    removeStill()
    onTestFinished(() => {
      removeStill = useStylesheet(STILL)
    })
  }

  // As a production build ships the CSS: prose links and bare utilities get
  // the link styles through nesting, which the optimizer lowers.
  it.each([
    [
      'a .prose link',
      '<div class="prose"><p><a href="#x">Line-up</a></p></div>',
      'background-size'
    ],
    [
      'a bare link-normal',
      '<a class="link-normal" href="#x">Line-up</a>',
      'background-size'
    ],
    [
      'a bare link-strong',
      '<a class="link-strong" href="#x">Line-up</a>',
      'background-size'
    ],
    [
      'a bare link-subtle',
      '<a class="link-subtle" href="#x">Line-up</a>',
      'text-underline-offset'
    ]
  ] as const)('moves %s part-way on hover', async (_, markup, property) => {
    withoutStill()
    const shipped = useStylesheet(await commands.optimizeCss(roadieCss))
    removeRoadie()
    onTestFinished(() => {
      shipped()
      removeRoadie = useStylesheet(roadieCss)
    })
    const host = document.createElement('p')
    host.style.fontSize = '16px'
    host.innerHTML = markup
    document.body.append(host)
    onTestFinished(() => host.remove())
    const link = host.querySelector('a')!
    const value = () =>
      property === 'background-size'
        ? getComputedStyle(link).backgroundSize
        : getComputedStyle(link).textUnderlineOffset
    const rest = value()

    expect(durations(link)[property]).toBeGreaterThan(0)
    await hover(link)
    const moving = link
      .getAnimations()
      .find(
        (animation) =>
          (animation as CSSTransition).transitionProperty === property
      )!
    moving.pause()
    moving.currentTime = 1000
    const end = value()
    moving.currentTime = moving.effect!.getTiming().delay! + 20
    const between = value()

    expect(between).not.toBe(rest)
    expect(between).not.toBe(end)
  })

  it.each([
    ['normal', 'background-size', 0.2],
    ['strong', 'background-size', 0.3],
    ['subtle', 'text-underline-offset', 0.4]
  ] as const)('springs a %s link’s %s', (emphasis, property, seconds) => {
    withoutStill()
    const { link } = renderLink({ emphasis })
    const style = getComputedStyle(link)
    const index = style.transitionProperty.split(', ').indexOf(property)

    expect(durations(link)[property]).toBeCloseTo(seconds)
    if (emphasis !== 'subtle')
      expect(durations(link)['--link-underline']).toBe(
        durations(link)['background-size']
      )
    expect(
      style.transitionTimingFunction.split(/,\s*(?![^()]*\))/)[index]
    ).toMatch(/^linear\(/)
  })

  // In neutral a strong link's underline is already the fill's accent, so danger shows the blend.
  it.each([
    ['normal', {}],
    ['strong', { intent: 'danger' }]
  ] as const)(
    'blends a %s link’s underline colour into the fill, not in one step',
    async (emphasis, props) => {
      withoutStill()
      const { link } = renderLink({ emphasis, ...props })
      const { underline: rest, fill } = layers(link)

      await hover(link)
      const blend = link
        .getAnimations()
        .find(
          (animation) =>
            (animation as CSSTransition).transitionProperty ===
            '--link-underline'
        )!
      blend.pause()
      blend.currentTime = blend.effect!.getTiming().delay! + 20

      const between = layers(link).underline
      expect(between).not.toBe(rest)
      expect(between).not.toBe(fill)
    }
  )

  it.each(['light', 'dark'] as const)(
    'turns each letter of a strong link as the fill reaches it, in %s',
    async (mode) => {
      withoutStill()
      document.documentElement.classList.toggle('dark', mode === 'dark')
      onTestFinished(() => document.documentElement.classList.remove('dark'))
      render(
        <p className='bg-normal' style={{ fontSize: 48, padding: 8 }}>
          <Link href='#lineup' emphasis='strong'>
            MMMMMMMMMM
          </Link>
        </p>
      )
      const link = screen.getByRole('link')

      await hover(link)
      for (const animation of link.getAnimations()) {
        animation.pause()
        const { delay, duration } = animation.effect!.getTiming()
        animation.currentTime = delay! + Number(duration) * 0.12
      }
      await frame()
      const filled = parseFloat(layers(link).inkSize!) / 100
      expect(filled).toBeGreaterThan(0.2)
      expect(filled).toBeLessThan(0.8)

      const box = link.getBoundingClientRect()
      const pixelAt = await capture(link)
      const band = (from: number, to: number) => {
        const seen: number[] = []
        for (
          let x = box.left + box.width * from;
          x < box.left + box.width * to;
          x += 2
        )
          for (let y = box.top + 4; y < box.bottom - 4; y += 2)
            seen.push(luminance(pixelAt(x, y)))
        return seen
      }
      const onFill = band(0.02, filled - 0.08)
      const beyond = band(filled + 0.08, 0.98)
      // In neutral the on-strong ink is the opposite of the resting ink in
      // both themes, so letters over the fill show one and the rest the other.
      const inkOnLight =
        luminance(paint(emphasisStrong('intent-neutral').text)) > 128
      const light = (value: number) => value > 200
      const dark = (value: number) => value < 55
      expect(onFill.some(inkOnLight ? light : dark)).toBe(true)
      expect(beyond.some(inkOnLight ? dark : light)).toBe(true)
    }
  )

  it.each(['normal', 'strong', 'subtle'] as const)(
    'jumps a %s link to its end state when motion is reduced',
    async (emphasis) => {
      withoutStill()
      await commands.reduceMotion(true)
      onTestFinished(() => commands.reduceMotion(false))
      const { link } = renderLink({ emphasis })

      const style = getComputedStyle(link)
      for (const time of Object.values(durations(link)))
        expect(time).toBeLessThan(0.001)
      expect(parseFloat(style.transitionDelay)).toBe(0)
    }
  )
})

describe('A link in prose', () => {
  function renderPair() {
    render(
      <div className='prose intent-danger'>
        <p>
          <a href='#prose'>Prose link</a> and{' '}
          <Link href='#component'>Component link</Link>
        </p>
      </div>
    )
    return {
      prose: screen.getByRole('link', { name: 'Prose link' }),
      component: screen.getByRole('link', { name: 'Component link' })
    }
  }

  it('looks the same as a normal Link at rest, accent in any intent', () => {
    const { prose, component } = renderPair()

    expect(look(prose)).toEqual(look(component))
    expect(layerColors(prose)[0]).toBe(tokenColor('--color-accent-9'))
  })

  it.each([
    ['hover', hover],
    ['keyboard focus', focusByKeyboard],
    [
      'a tap on a touch screen',
      async (link: HTMLElement) => {
        setHoverCapable(false)
        await userEvent.hover(link)
        await frame()
      }
    ]
  ] as const)(
    'matches a normal Link on %s as a production build ships it',
    async (_, engage) => {
      const shipped = useStylesheet(await commands.optimizeCss(roadieCss))
      removeRoadie()
      onTestFinished(() => {
        shipped()
        removeRoadie = useStylesheet(roadieCss)
      })
      const { prose, component } = renderPair()

      await engage(prose)
      const proseLook = look(prose)
      await engage(component)

      expect(proseLook).toEqual(look(component))
    }
  )

  it('looks the same as a normal Link on hover', async () => {
    const { prose, component } = renderPair()

    await hover(prose)
    const proseHover = look(prose)
    await hover(component)

    expect(proseHover).toEqual(look(component))
    expect(proseHover.size).toMatch(FULL_LESS_LINE)
  })
})
