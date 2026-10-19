import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Link, type LinkProps } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { setHoverCapable } from '../../css/testUtils'
import { pointAt } from '../../utils/pointerTestUtils'
import { useStylesheet } from '../Pane/testUtils'

const STILL = '*, *::before, *::after { transition: none !important }'

let removeStylesheets = () => {}
beforeAll(() => {
  const removeRoadie = useStylesheet(roadieCss)
  const removeStill = useStylesheet(STILL)
  removeStylesheets = () => {
    removeRoadie()
    removeStill()
  }
})
afterAll(() => removeStylesheets())
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

function look(element: Element) {
  const style = getComputedStyle(element)
  return {
    color: style.color,
    line: style.textDecorationLine,
    underline: style.textDecorationColor
  }
}

function renderLink(props: Partial<LinkProps> = {}) {
  render(
    <p className='text-subtle'>
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

describe('Link emphasis at rest', () => {
  it('underlines normal links in the accent colour and keeps the text colour', () => {
    const { link, text } = renderLink()

    expect(look(link)).toEqual({
      color: text,
      line: 'underline',
      underline: tokenColor('--color-accent-9')
    })
  })

  it('colours strong links in accent text with an accent underline', () => {
    const { link } = renderLink({ emphasis: 'strong' })

    expect(look(link)).toEqual({
      color: tokenColor('--color-accent-11'),
      line: 'underline',
      underline: tokenColor('--color-accent-9')
    })
  })

  it('leaves subtle links without an underline in the text colour', () => {
    const { link, text } = renderLink({ emphasis: 'subtle' })

    expect(look(link)).toMatchObject({ color: text, line: 'none' })
  })
})

describe('Link intent', () => {
  it('takes its underline from the intent', () => {
    const { link } = renderLink({ intent: 'danger' })

    expect(look(link).underline).toBe(tokenColor('--color-danger-9'))
  })

  it('takes a strong link’s text colour from the intent', () => {
    const { link } = renderLink({ intent: 'danger', emphasis: 'strong' })

    expect(look(link).color).toBe(tokenColor('--color-danger-11'))
  })

  it('takes its colour from an intent on an ancestor', () => {
    render(
      <div className='intent-success'>
        <Link href='#lineup' emphasis='strong'>
          Ochre Kite Weekender
        </Link>
      </div>
    )

    expect(look(screen.getByRole('link')).color).toBe(
      tokenColor('--color-success-11')
    )
  })
})

describe.each(['normal', 'strong', 'subtle'] as const)(
  'A %s link when engaged',
  (emphasis) => {
    it('underlines in its text colour on hover', async () => {
      const { link } = renderLink({ emphasis })

      await pointAt(link)
      await frame()

      const { color, line, underline } = look(link)
      expect(line).toBe('underline')
      expect(underline).toBe(color)
    })

    it('underlines in its text colour and shows the focus ring on keyboard focus', async () => {
      const { link } = renderLink({ emphasis })

      // Tab skips links in WebKit and in macOS Firefox by default, so focus after a key press, which still reads as keyboard focus.
      await userEvent.keyboard('{Shift}')
      link.focus()
      await frame()

      expect(link.matches(':focus-visible')).toBe(true)
      const { color, line, underline } = look(link)
      expect(line).toBe('underline')
      expect(underline).toBe(color)
      expect(parseFloat(getComputedStyle(link).outlineWidth)).toBeGreaterThan(0)
    })

    it('keeps its resting look after a tap on a touch screen', async () => {
      setHoverCapable(false)
      const { link } = renderLink({ emphasis })
      const rest = look(link)

      await userEvent.hover(link)
      await frame()

      expect(link.matches(':hover')).toBe(true)
      expect(look(link)).toEqual(rest)
    })
  }
)

describe('A link in prose', () => {
  function renderPair() {
    render(
      <div className='prose'>
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

  const underline = (element: Element) => {
    const style = getComputedStyle(element)
    return {
      ...look(element),
      thickness: style.textDecorationThickness,
      offset: style.textUnderlineOffset
    }
  }

  it('looks the same as a normal Link at rest', () => {
    const { prose, component } = renderPair()

    expect(underline(prose)).toEqual(underline(component))
  })

  it('looks the same as a normal Link on hover', async () => {
    const { prose, component } = renderPair()

    await pointAt(prose)
    await frame()
    const proseHover = underline(prose)
    await pointAt(component)
    await frame()

    expect(proseHover).toEqual(underline(component))
  })
})
