import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, userEvent } from 'vitest/browser'

import { ToggleGroup, type ToggleGroupProps } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { setHoverCapable } from '../../css/testUtils'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { Toggle } from '../Toggle'

let removeStylesheet = () => {}
// Items measured in a fallback font change width once the brand font swaps
// in, after the group has scrolled to them.
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(async () => {
  setHoverCapable(true)
  await userEvent.unhover(document.body)
  cleanup()
})

const EMPHASES = ['normal', 'subtle', 'subtler'] as const

function DateRange(props: Omit<ToggleGroupProps, 'children'>) {
  return (
    <ToggleGroup aria-label='Date range' defaultValue={['30d']} {...props}>
      <ToggleGroup.Item value='7d'>7 days</ToggleGroup.Item>
      <ToggleGroup.Item value='30d'>30 days</ToggleGroup.Item>
      <ToggleGroup.Item value='90d'>Last 90 days</ToggleGroup.Item>
    </ToggleGroup>
  )
}

const indicator = () =>
  document.querySelector<HTMLElement>('[data-slot="toggle-group-indicator"]')!

function rectOf(element: Element) {
  const { left, top, width, height } = element.getBoundingClientRect()
  return { left, top, width, height }
}

function gap(pill: DOMRect, item: DOMRect) {
  return Math.max(
    Math.abs(pill.left - item.left),
    Math.abs(pill.top - item.top),
    Math.abs(pill.width - item.width),
    Math.abs(pill.height - item.height)
  )
}

// The pill slides between items. Where it lands is under test, not the
// slide, so each wait skips its transition to the end.
async function expectPillOver(name: string) {
  const item = screen.getByRole('button', { name })
  await expect
    .poll(
      () => {
        for (const animation of indicator().getAnimations()) animation.finish()
        return gap(
          indicator().getBoundingClientRect(),
          item.getBoundingClientRect()
        )
      },
      { timeout: 5000 }
    )
    .toBeLessThan(1)
}

const NARROW = 160

function NarrowDateRange(props: Omit<ToggleGroupProps, 'children'>) {
  return (
    <div style={{ width: NARROW }}>
      <DateRange {...props} />
    </div>
  )
}

function expectWholeLabel(item: HTMLElement) {
  expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth)
}

async function expectInView(name: string) {
  const item = screen.getByRole('button', { name })
  expectWholeLabel(item)
  const frame = screen.getByRole('group').parentElement!
  await expect
    .poll(
      () => {
        const shown = frame.getBoundingClientRect()
        const { left, right } = item.getBoundingClientRect()
        return left >= shown.left - 0.5 && right <= shown.right + 0.5
      },
      { timeout: 5000 }
    )
    .toBe(true)
}

describe.each(EMPHASES)('the %s sliding pill', (emphasis) => {
  it('sits over the pressed item', async () => {
    render(<DateRange emphasis={emphasis} />)
    await expectPillOver('30 days')
  })

  it('fills the pill differently from the track', async () => {
    render(<DateRange emphasis={emphasis} />)
    await expectPillOver('30 days')
    const fill = (element: Element) => getComputedStyle(element).backgroundColor
    expect(fill(indicator())).not.toBe(fill(screen.getByRole('group')))
  })

  it('sets the pressed label apart from the rest, hovered or not', async () => {
    render(<DateRange emphasis={emphasis} />)
    const pressed = screen.getByRole('button', { name: '30 days' })
    const rest = screen.getByRole('button', { name: '7 days' })
    const colour = (element: Element) => getComputedStyle(element).color
    await expect.poll(() => colour(pressed)).not.toBe(colour(rest))
    if (emphasis !== 'subtler') {
      await expect.poll(() => colour(pressed)).toBe(colour(indicator()))
    }
    const atRest = colour(pressed)
    await userEvent.hover(pressed)
    await expect.poll(() => colour(pressed)).toBe(atRest)
  })

  it('moves to the newly pressed item', async () => {
    render(<DateRange emphasis={emphasis} />)
    await expectPillOver('30 days')
    const before = rectOf(indicator())

    await userEvent.click(screen.getByRole('button', { name: 'Last 90 days' }))
    await expectPillOver('Last 90 days')
    expect(rectOf(indicator()).left).toBeGreaterThan(before.left)
  })

  it('resizes with a content-sized item', async () => {
    render(<DateRange emphasis={emphasis} className='flex' />)
    await expectPillOver('30 days')
    const before = rectOf(indicator())

    await userEvent.click(screen.getByRole('button', { name: 'Last 90 days' }))
    await expectPillOver('Last 90 days')
    expect(rectOf(indicator()).width).toBeGreaterThan(before.width)
  })

  it('follows the pressed item down a vertical group', async () => {
    render(<DateRange emphasis={emphasis} direction='vertical' />)
    await expectPillOver('30 days')
    const before = rectOf(indicator())

    await userEvent.click(screen.getByRole('button', { name: '7 days' }))
    await expectPillOver('7 days')
    expect(rectOf(indicator()).top).toBeLessThan(before.top)
  })

  it('scrolls sideways on one row when space runs out', async () => {
    render(<NarrowDateRange emphasis={emphasis} />)
    const group = screen.getByRole('group')
    const items = screen.getAllByRole('button')
    expect(new Set(items.map((item) => rectOf(item).top)).size).toBe(1)
    items.forEach(expectWholeLabel)
    expect(rectOf(group).width).toBeLessThanOrEqual(NARROW)
    expect(group.scrollWidth).toBeGreaterThan(group.clientWidth)
  })

  it('scrolls the pressed item into view', async () => {
    render(<NarrowDateRange emphasis={emphasis} defaultValue={['90d']} />)
    await expectInView('Last 90 days')
    await expectPillOver('Last 90 days')
  })

  it('reaches the last item from the keyboard', async () => {
    render(<NarrowDateRange emphasis={emphasis} defaultValue={['7d']} />)
    await userEvent.tab()
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{Enter}')
    expect(screen.getByRole('button', { name: 'Last 90 days' })).toHaveFocus()
    await expectInView('Last 90 days')
    await expectPillOver('Last 90 days')
  })

  it('keeps the focus ring inside the scrolling track', async () => {
    const removeStill = useStylesheet('* { transition: none !important }')
    render(<NarrowDateRange emphasis={emphasis} />)
    await userEvent.tab()
    const item = screen.getByRole('button', { name: '30 days' })
    expect(item).toHaveFocus()
    const group = screen.getByRole('group')
    const ring = () => {
      const { outlineWidth, outlineOffset } = getComputedStyle(item)
      return parseFloat(outlineWidth) + parseFloat(outlineOffset)
    }
    removeStill()
    const clipTop = group.getBoundingClientRect().top + group.clientTop
    const clipBottom = clipTop + group.clientHeight
    const { top, bottom } = item.getBoundingClientRect()
    expect(top - ring()).toBeGreaterThanOrEqual(clipTop - 0.5)
    expect(bottom + ring()).toBeLessThanOrEqual(clipBottom + 0.5)
  })

  for (const dir of ['ltr', 'rtl'] as const) {
    it(`keeps a pressed end item and its ring in view when tabbed to (${dir})`, async () => {
      const removeStill = useStylesheet('* { transition: none !important }')
      render(
        <div dir={dir}>
          <NarrowDateRange emphasis={emphasis} defaultValue={['90d']} />
        </div>
      )
      await expectPillOver('Last 90 days')
      await userEvent.tab()
      const item = screen.getByRole('button', { name: 'Last 90 days' })
      expect(item).toHaveFocus()
      const group = screen.getByRole('group')
      const { outlineWidth, outlineOffset } = getComputedStyle(item)
      const ring = parseFloat(outlineWidth) + parseFloat(outlineOffset)
      removeStill()
      expect(ring).toBeGreaterThan(0)
      // scrollWidth rounds to whole pixels, so the far end can fall short by
      // a fraction.
      await expect
        .poll(
          () => {
            const clipLeft =
              group.getBoundingClientRect().left + group.clientLeft
            const { left, right } = item.getBoundingClientRect()
            return (
              left - ring >= clipLeft - 1 &&
              right + ring <= clipLeft + group.clientWidth + 1
            )
          },
          { timeout: 2000 }
        )
        .toBe(true)
    })
  }

  it('reaches an earlier item from the keyboard after scrolling to the end', async () => {
    render(<NarrowDateRange emphasis={emphasis} defaultValue={['90d']} />)
    await expectPillOver('Last 90 days')
    await userEvent.tab()
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}{Enter}')
    expect(screen.getByRole('button', { name: '7 days' })).toHaveFocus()
    await expectInView('7 days')
    await expectPillOver('7 days')
  })
})

describe('an edge fade', () => {
  const fades = () => {
    const style = getComputedStyle(screen.getByRole('group'))
    return [
      style.getPropertyValue('--toggle-group-fade-left').trim(),
      style.getPropertyValue('--toggle-group-fade-right').trim()
    ]
  }
  const masked = () => {
    const style = getComputedStyle(screen.getByRole('group'))
    return style.maskImage || style.getPropertyValue('-webkit-mask-image')
  }

  it('fades only the side that can still scroll', async () => {
    render(<NarrowDateRange defaultValue={['7d']} />)
    const group = screen.getByRole('group')
    await expectPillOver('7 days')
    await expect.poll(fades).toEqual(['0px', '24px'])
    expect(masked()).toContain('linear-gradient')
    group.scrollLeft = group.scrollWidth
    await expect.poll(fades).toEqual(['24px', '0px'])
  })

  it('fades the far side first in a right-to-left layout', async () => {
    render(
      <div dir='rtl'>
        <NarrowDateRange defaultValue={['7d']} />
      </div>
    )
    await expect.poll(fades).toEqual(['24px', '0px'])
  })

  it('leaves a group with room for every item unfaded and unmasked', async () => {
    render(<DateRange />)
    await expect.poll(fades).toEqual(['0px', '0px'])
    // A mask clips any outer shadow or outline a page adds.
    expect(masked()).toBe('none')
  })

  function Labels({ labels }: { labels: string[] }) {
    return (
      <div style={{ width: NARROW }}>
        <ToggleGroup aria-label='Date range' className='w-full'>
          {labels.map((label) => (
            <ToggleGroup.Item key={label} value={label}>
              {label}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup>
      </div>
    )
  }

  // Past the group's first resize observation, which would mark it anyway.
  const settled = async () => {
    for (let frame = 0; frame < 3; frame++)
      await new Promise(requestAnimationFrame)
  }

  it('fades once new items overflow a full-width group', async () => {
    const { rerender } = render(<Labels labels={['Day', 'Week']} />)
    await expect.poll(fades).toEqual(['0px', '0px'])
    await settled()
    rerender(<Labels labels={['Day', 'Week', 'Month', 'Quarter', 'Year']} />)
    await expect.poll(fades).toEqual(['0px', '24px'])
  })

  it('stops fading once the items fit a full-width group again', async () => {
    const { rerender } = render(
      <Labels labels={['Day', 'Week', 'Month', 'Quarter', 'Year']} />
    )
    await expect.poll(fades).toEqual(['0px', '24px'])
    await settled()
    rerender(<Labels labels={['Day', 'Week']} />)
    await expect.poll(fades).toEqual(['0px', '0px'])
  })

  it('fades the end again once an item joins it', async () => {
    const labels = ['Day', 'Week', 'Month', 'Quarter', 'Year']
    const { rerender } = render(<Labels labels={labels} />)
    const group = screen.getByRole('group')
    await expect.poll(fades).toEqual(['0px', '24px'])
    group.scrollLeft = group.scrollWidth
    await expect.poll(fades).toEqual(['24px', '0px'])
    await settled()
    rerender(<Labels labels={[...labels, 'Decade']} />)
    await expect.poll(fades).toEqual(['24px', '24px'])
  })

  // As when a web font loads and the labels widen, with nothing rendered.
  it('fades once its items widen past a full-width group', async () => {
    render(<Labels labels={['Day', 'Week']} />)
    await expect.poll(fades).toEqual(['0px', '0px'])
    await settled()
    for (const item of screen.getAllByRole('button'))
      item.style.paddingInline = `${NARROW}px`
    await expect.poll(fades).toEqual(['0px', '24px'])
  })

  it('scrolls a pressed item clear of the fade', async () => {
    const labels = ['Day', 'Week', 'Month', 'Quarter', 'Year']
    function Pressed({ value }: { value: string }) {
      return (
        <div style={{ width: NARROW }}>
          <ToggleGroup aria-label='Date range' value={[value]}>
            {labels.map((label) => (
              <ToggleGroup.Item key={label} value={label}>
                {label}
              </ToggleGroup.Item>
            ))}
          </ToggleGroup>
        </div>
      )
    }
    const { rerender } = render(<Pressed value='Year' />)
    await expectPillOver('Year')
    rerender(<Pressed value='Week' />)
    await expectPillOver('Week')
    const group = screen.getByRole('group').getBoundingClientRect()
    const item = screen.getByRole('button', { name: 'Week' })
    expect(item.getBoundingClientRect().left - group.left).toBeGreaterThan(24)
  })

  it('presses an item half under the fade on a click', async () => {
    const labels = ['Day', 'Week', 'Month', 'Quarter', 'Year']
    render(
      <div style={{ width: NARROW }}>
        <ToggleGroup aria-label='Date range' multiple>
          {labels.map((label) => (
            <ToggleGroup.Item key={label} value={label}>
              {label}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup>
      </div>
    )
    const group = screen.getByRole('group').getBoundingClientRect()
    const cut = screen
      .getAllByRole('button')
      .find((item) => item.getBoundingClientRect().right > group.right)!
    const { left } = cut.getBoundingClientRect()
    await userEvent.click(cut, {
      position: { x: (group.right - left) / 2, y: 4 }
    })
    expect(cut).toHaveAttribute('aria-pressed', 'true')
  })

  for (const multiple of [false, true])
    it(`scrolls to the end Home or End moves focus to, clear of the fade${multiple ? ', in a multiple group' : ''}`, async () => {
      const labels = ['Day', 'Week', 'Month', 'Quarter', 'Year']
      render(
        <div style={{ width: NARROW }}>
          <ToggleGroup
            aria-label='Date range'
            multiple={multiple}
            defaultValue={['Day']}
          >
            {labels.map((label) => (
              <ToggleGroup.Item key={label} value={label}>
                {label}
              </ToggleGroup.Item>
            ))}
          </ToggleGroup>
        </div>
      )
      const group = screen.getByRole('group')
      await expect.poll(fades).toEqual(['0px', '24px'])
      // The group scrolls clear of the fade on focus, which Firefox only
      // reports in a focused window.
      await commands.focusPage()
      await expect.poll(() => document.hasFocus()).toBe(true)
      await userEvent.tab()
      await userEvent.keyboard('{End}')
      expect(screen.getByRole('button', { name: 'Year' })).toHaveFocus()
      const room = group.scrollWidth - group.clientWidth
      await expect.poll(() => group.scrollLeft).toBeGreaterThanOrEqual(room - 1)
      await expect.poll(fades).toEqual(['24px', '0px'])
      await userEvent.keyboard('{Home}')
      expect(screen.getByRole('button', { name: 'Day' })).toHaveFocus()
      await expect.poll(() => group.scrollLeft).toBeLessThanOrEqual(1)
      await expect.poll(fades).toEqual(['0px', '24px'])
    })

  it('keeps the item focus is on in view as the group resizes', async () => {
    const labels = ['Day', 'Week', 'Month', 'Quarter', 'Year']
    render(
      <div style={{ width: NARROW }}>
        <ToggleGroup aria-label='Date range' defaultValue={['Day']}>
          {labels.map((label) => (
            <ToggleGroup.Item key={label} value={label}>
              {label}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup>
      </div>
    )
    const group = screen.getByRole('group')
    await expectPillOver('Day')
    await commands.focusPage()
    await expect.poll(() => document.hasFocus()).toBe(true)
    await userEvent.tab()
    await userEvent.keyboard('{End}')
    expect(screen.getByRole('button', { name: 'Year' })).toHaveFocus()
    await expect
      .poll(() => group.scrollLeft)
      .toBeGreaterThanOrEqual(group.scrollWidth - group.clientWidth - 1)
    group.parentElement!.style.width = `${NARROW - 20}px`
    // Observers run in the order they were made, so the group's own has run
    // by the time this one first reports the new size.
    await new Promise<void>((resolve) => {
      const observer = new ResizeObserver(() => {
        observer.disconnect()
        resolve()
      })
      observer.observe(group)
    })
    expect(group.scrollLeft).toBeGreaterThanOrEqual(
      group.scrollWidth - group.clientWidth - 1
    )
  })
})

it('keeps the same height at every emphasis', () => {
  render(
    <>
      {EMPHASES.map((emphasis) => (
        <DateRange key={emphasis} emphasis={emphasis} />
      ))}
    </>
  )
  const heights = screen
    .getAllByRole('group')
    .map((group) => group.getBoundingClientRect().height)
  expect(new Set(heights).size).toBe(1)
})

function look(element: Element) {
  const { color, backgroundColor, boxShadow, transform } =
    getComputedStyle(element)
  return { color, backgroundColor, boxShadow, transform }
}

describe('a tap on a touch screen', () => {
  let removeStill = () => {}
  beforeAll(() => {
    removeStill = useStylesheet(
      '*, *::before, *::after { transition: none !important }'
    )
  })
  afterAll(() => removeStill())

  it.each(EMPHASES)(
    'leaves no hover on a %s group item, pressed or not',
    async (emphasis) => {
      setHoverCapable(false)
      render(<DateRange emphasis={emphasis} />)
      await expectPillOver('30 days')
      for (const name of ['7 days', '30 days']) {
        const item = screen.getByRole('button', { name })
        const rest = look(item)
        await userEvent.hover(item)
        expect(item.matches(':hover')).toBe(true)
        await expect.poll(() => look(item)).toEqual(rest)
      }
    }
  )

  it('leaves no hover on a pressed or unpressed Toggle', async () => {
    setHoverCapable(false)
    render(
      <>
        <Toggle>Notify me</Toggle>
        <Toggle defaultPressed>Presale alerts</Toggle>
      </>
    )
    for (const name of ['Notify me', 'Presale alerts']) {
      const toggle = screen.getByRole('button', { name })
      const rest = look(toggle)
      await userEvent.hover(toggle)
      expect(toggle.matches(':hover')).toBe(true)
      await expect.poll(() => look(toggle)).toEqual(rest)
    }
  })
})
