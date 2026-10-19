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
import { commands, userEvent } from 'vitest/browser'

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
  probe.style.color = `var(${token})`
  document.body.append(probe)
  const color = getComputedStyle(probe).color
  probe.remove()
  return color
}

const TRANSPARENT = 'rgba(0, 0, 0, 0)'

// A paused transition reports its colour in another space, so compare what paints.
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
    : style.backgroundSize.split(', ')[0]!.split(' ')[1]
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

describe('A strong link', () => {
  it('rests in accent text with an accent underline and no fill', () => {
    const { link } = renderLink({ emphasis: 'strong' })

    expect(look(link)).toMatchObject({
      color: tokenColor('--color-accent-11'),
      line: 'none'
    })
    expect(look(link).size).toBe('100% 1px, 0% 100%')
    expect(layerColors(link)[0]).toBe(tokenColor('--color-accent-9'))
  })

  it.each(engagements)(
    'fills from the left as an accent emphasis-strong, merging its underline, on %s',
    async (_, engage) => {
      const { link } = renderLink({ emphasis: 'strong' })

      await engage(link)

      const [underline, fill] = layerColors(link)
      const strong = emphasisStrong('intent-accent')
      expect(look(link).size).toBe('100% 1px, 100% 100%')
      expect(underline).toBe(fill)
      expect({ fill, text: look(link).color }).toEqual(strong)
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
    expect(layerColors(link)[0]).toBe(tokenColor('--color-danger-9'))
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

    const [, fill] = layerColors(link)
    expect({ fill, text: look(link).color }).toEqual(
      emphasisStrong('intent-danger')
    )
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
    moving.currentTime = 20
    const between = value()

    expect(between).not.toBe(rest)
    expect(between).not.toBe(end)
  })

  it.each([
    ['normal', 'background-size', 0.2],
    ['strong', 'background-size', 0.2],
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
      const [rest, fill] = layerColors(link)

      await hover(link)
      const blend = link
        .getAnimations()
        .find(
          (animation) =>
            (animation as CSSTransition).transitionProperty ===
            '--link-underline'
        )!
      blend.pause()
      blend.currentTime = 20

      const [between] = layerColors(link)
      expect(between).not.toBe(rest)
      expect(between).not.toBe(fill)
    }
  )

  it('keeps a strong link’s text in its resting colour until the fill has all but covered it', async () => {
    withoutStill()
    const { link } = renderLink({ emphasis: 'strong' })
    const rest = look(link).color
    const at = (time: number) => {
      for (const animation of link.getAnimations()) {
        animation.pause()
        animation.currentTime = time
      }
      return look(link).color
    }

    await hover(link)

    expect(pixel(at(50))).toEqual(pixel(rest))
    expect(pixel(at(150))).toEqual(pixel(emphasisStrong('intent-accent').text))
  })

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
