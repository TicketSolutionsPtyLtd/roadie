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
    expect(look(link).size).toMatch(/^100% 1px, 0% calc/)
    expect(layerColors(link)[0]).toBe(tokenColor('--color-accent-9'))
  })

  it.each(engagements)(
    'fills from the left, merging its underline into the fill, on %s',
    async (_, engage) => {
      const { link } = renderLink({ emphasis: 'strong' })

      await engage(link)

      const [underline, fill] = layerColors(link)
      expect(look(link).size).toMatch(FULL_LESS_LINE)
      expect(underline).toBe(fill)
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

  it.each(['normal', 'strong'] as const)(
    'blends a %s link’s underline colour into the fill, not in one step',
    async (emphasis) => {
      withoutStill()
      const { link } = renderLink({ emphasis })
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

  it('looks the same as a normal Link on hover', async () => {
    const { prose, component } = renderPair()

    await hover(prose)
    const proseHover = look(prose)
    await hover(component)

    expect(proseHover).toEqual(look(component))
    expect(proseHover.size).toMatch(FULL_LESS_LINE)
  })
})
