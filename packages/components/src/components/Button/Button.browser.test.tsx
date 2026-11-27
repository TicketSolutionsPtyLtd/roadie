import { type ReactNode } from 'react'

import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { useStylesheet } from '@oztix/roadie-browser-testing/stylesheet'

import { Button, IconButton } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Badge } from '../Badge'
import { Toggle } from '../Toggle'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

// Zero alpha as each engine writes it: rgba(…, 0), color(… / 0), oklab(… / 0).
const TRANSPARENT = /^rgba\(.+, 0\)$|\/ 0\)$/

const ROW = 80
const buttons: [string, ReactNode][] = [
  ['Button', <Button key='b'>Save</Button>],
  [
    'IconButton',
    <IconButton key='i' aria-label='Save'>
      <span />
    </IconButton>
  ],
  ['Toggle', <Toggle key='t'>Save</Toggle>]
]

function place(rowClass: string, button: ReactNode) {
  render(
    <div data-testid='row' className={rowClass} style={{ height: ROW }}>
      {button}
    </div>
  )
  const row = screen.getByTestId('row').getBoundingClientRect()
  const box = screen.getByRole('button').getBoundingClientRect()
  return {
    top: box.top - row.top,
    left: box.left - row.left,
    height: box.height,
    width: box.width,
    rowWidth: row.width
  }
}

describe.each(buttons)('%s alignment', (_, button) => {
  it('centres in a taller items-center flex row', () => {
    const { top, height } = place('flex items-center', button)
    expect(height).toBeLessThan(ROW)
    expect(top).toBeCloseTo((ROW - height) / 2, 0)
  })

  it('sits at the top of a taller items-start flex row', () => {
    const { top } = place('flex items-start', button)
    expect(top).toBe(0)
  })

  it('keeps its height at the top of a default flex row', () => {
    const { top, height } = place('flex', button)
    expect(top).toBe(0)
    expect(height).toBeLessThan(ROW)
  })

  it('sits at the start of a taller grid row without stretching', () => {
    const { top, left, height, width, rowWidth } = place('grid', button)
    expect(top).toBe(0)
    expect(left).toBe(0)
    expect(height).toBeLessThan(ROW)
    expect(width).toBeLessThan(rowWidth)
  })

  it('centres in a grid with justify-items-center', () => {
    const { left, width, rowWidth } = place('grid justify-items-center', button)
    expect(left).toBeCloseTo((rowWidth - width) / 2, 0)
  })

  it('keeps its width at the start of a default flex column', () => {
    const { left, width, rowWidth } = place('flex flex-col', button)
    expect(left).toBe(0)
    expect(width).toBeLessThan(rowWidth)
  })

  it('centres across an items-center flex column', () => {
    const { left, width, rowWidth } = place(
      'flex flex-col items-center',
      button
    )
    expect(left).toBeCloseTo((rowWidth - width) / 2, 0)
  })
})

describe('Button width overrides', () => {
  it('spans its cell with w-full', () => {
    const { width, rowWidth } = place(
      'grid',
      <Button className='w-full'>Save</Button>
    )
    expect(width).toBe(rowWidth)
  })

  it('spans a flex column with w-full', () => {
    const { width, rowWidth } = place(
      'flex flex-col',
      <Button className='w-full'>Save</Button>
    )
    expect(width).toBe(rowWidth)
  })

  it('shares a flex row with flex-1', () => {
    render(
      <div data-testid='row' className='flex w-80 gap-2'>
        <Button className='flex-1'>Keep browsing</Button>
        <Button className='flex-1'>Pay</Button>
      </div>
    )
    const [first, second] = screen
      .getAllByRole('button')
      .map((button) => button.getBoundingClientRect().width)
    expect(first).toBe(second)
  })

  it('keeps an IconButton square in a flex column', () => {
    const { width, height } = place(
      'flex flex-col',
      <IconButton aria-label='Save'>
        <span />
      </IconButton>
    )
    expect(width).toBe(height)
  })
})

describe('icons in a component inside a Button', () => {
  const width = (testId: string) =>
    screen.getByTestId(testId).getBoundingClientRect().width

  it.each(['xs', 'md'] as const)(
    'leaves a nested component to size its own icon at %s',
    (size) => {
      render(
        <Button size={size}>
          <svg data-testid='own' viewBox='0 0 16 16' />
          Tickets
          <Badge size='md'>
            <svg data-testid='nested' viewBox='0 0 16 16' />3
          </Badge>
        </Button>
      )
      const badgeFont = parseFloat(
        getComputedStyle(screen.getByTestId('nested').parentElement!).fontSize
      )
      expect(width('nested')).toBeCloseTo(badgeFont, 0)
      expect(width('own')).toBe(size === 'xs' ? 12 : 16)
    }
  )

  it('lets a w-* and h-* class size the button’s own icon', () => {
    render(
      <Button size='xs'>
        <svg data-testid='own' className='h-6 w-6' viewBox='0 0 16 16' />
        Tickets
      </Button>
    )
    expect(width('own')).toBe(24)
  })
})

describe('a pending button', () => {
  // Every animation but the endless spin, such as the press, which scales the
  // drawn box while it runs.
  const settled = (button: HTMLElement) =>
    Promise.all(
      button
        .getAnimations({ subtree: true })
        .filter(
          (animation) =>
            animation.effect?.getComputedTiming().iterations !== Infinity
        )
        .map((animation) => animation.finished)
    )
  const box = (element: Element) => {
    const { width, height } = element.getBoundingClientRect()
    return { width, height }
  }
  const icon = <svg data-testid='icon' viewBox='0 0 16 16' />
  const shapes = {
    text: (pending: boolean, size: 'xs' | 'sm' | 'md' | 'lg') => (
      <Button size={size} pending={pending}>
        Save changes
      </Button>
    ),
    'icon and text': (pending: boolean, size: 'xs' | 'sm' | 'md' | 'lg') => (
      <Button size={size} pending={pending}>
        {icon}
        Save changes
      </Button>
    ),
    'icon only': (pending: boolean, size: 'xs' | 'sm' | 'md' | 'lg') => (
      <IconButton size={size} aria-label='Save' pending={pending}>
        {icon}
      </IconButton>
    )
  }

  describe.each(Object.entries(shapes))('%s', (_, shape) => {
    it.each(['xs', 'sm', 'md', 'lg'] as const)(
      'keeps its size at %s',
      async (size) => {
        const { rerender } = render(shape(false, size))
        // A font that arrives mid-test would change the width, not pending.
        await document.fonts.ready
        const button = screen.getByRole('button')
        const rest = box(button)
        rerender(shape(true, size))
        expect(button).toHaveAttribute('aria-busy', 'true')
        expect(box(button)).toEqual(rest)
        // And once the spinner has replaced the label. The press is a scale,
        // which moves the drawn box but not the layout, so wait it out.
        await settled(button)
        expect(getComputedStyle(button, '::before').opacity).toBe('1')
        expect(box(button)).toEqual(rest)
      }
    )
  })

  it('shows a ring in place of its label, undimmed, after 200ms', async () => {
    render(
      <Button emphasis='strong' pending>
        {icon}
        Save
      </Button>
    )
    const button = screen.getByRole('button')
    const ring = getComputedStyle(button, '::before')
    await expect.poll(() => ring.opacity, { timeout: 2000 }).toBe('1')
    await expect
      .poll(() => getComputedStyle(screen.getByTestId('icon')).opacity, {
        timeout: 2000
      })
      .toBe('0')
    await expect
      .poll(() => getComputedStyle(button).webkitTextFillColor, {
        timeout: 2000
      })
      .toMatch(TRANSPARENT)
    expect(ring.borderTopColor).toBe(getComputedStyle(button).color)
    expect(ring.borderRadius).not.toBe('0px')
    expect(getComputedStyle(button).opacity).toBe('1')
    expect(getComputedStyle(button).filter).toBe('none')
  })

  it('waits 200ms, then springs the ring in as the label leaves', () => {
    render(
      <Button emphasis='strong' pending>
        {icon}
        Save
      </Button>
    )
    const button = screen.getByRole('button')
    const ring = getComputedStyle(button, '::before')
    const label = getComputedStyle(screen.getByTestId('icon'))
    const animations = button.getAnimations({ subtree: true })
    const at = (ms: number) => {
      for (const animation of animations) {
        animation.pause()
        animation.currentTime = ms
      }
    }

    at(190)
    expect(ring.opacity).toBe('0')
    expect(label.opacity).toBe('1')
    expect(getComputedStyle(button).webkitTextFillColor).not.toMatch(
      TRANSPARENT
    )

    at(600)
    expect(ring.opacity).toBe('1')
    expect(label.opacity).toBe('0')
    expect(getComputedStyle(button).webkitTextFillColor).toMatch(TRANSPARENT)
  })

  it('shrinks a text label away, and springs it back when it rests', async () => {
    const { container, rerender } = render(<Button>Save changes</Button>)
    rerender(<Button pending>Save changes</Button>)
    const label = container.querySelector<HTMLElement>(
      '[data-slot="button-label"]'
    )!
    await settled(screen.getByRole('button'))
    expect(getComputedStyle(label).scale).toBe('0.6')
    expect(getComputedStyle(label).opacity).toBe('0')
    rerender(<Button>Save changes</Button>)
    // On its way back, then whole again.
    expect(getComputedStyle(label).opacity).not.toBe('1')
    await settled(screen.getByRole('button'))
    expect(getComputedStyle(label).opacity).toBe('1')
    expect(['1', 'none']).toContain(getComputedStyle(label).scale)
  })

  it('spins the ring', () => {
    render(<Button pending>Save</Button>)
    expect(
      getComputedStyle(
        screen.getByRole('button'),
        '::before'
      ).animationIterationCount.split(', ')
    ).toContain('infinite')
  })

  it('centres the ring', async () => {
    render(<Button pending>Save changes</Button>)
    const button = screen.getByRole('button')
    await settled(button)
    const ring = getComputedStyle(button, '::before')
    const { width, height } = box(button)
    // Inset from every edge equally, so the ring sits in the middle.
    expect(parseFloat(ring.left) * 2 + parseFloat(ring.width)).toBeCloseTo(
      width,
      0
    )
    expect(parseFloat(ring.top) * 2 + parseFloat(ring.height)).toBeCloseTo(
      height,
      0
    )
  })

  it('keeps a positioning class', () => {
    render(
      <div className='relative h-40 w-40'>
        <Button pending className='absolute end-0 bottom-0'>
          Save
        </Button>
      </div>
    )
    expect(getComputedStyle(screen.getByRole('button')).position).toBe(
      'absolute'
    )
  })

  it('stays dimmed, with no ring, when disabled too', () => {
    render(
      <Button pending disabled>
        Save
      </Button>
    )
    const button = screen.getByRole('button')
    expect(getComputedStyle(button).opacity).toBe('0.5')
    expect(getComputedStyle(button, '::before').content).toBe('none')
  })
})
