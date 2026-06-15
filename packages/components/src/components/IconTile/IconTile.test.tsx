import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { IconTile } from '.'

describe('IconTile', () => {
  it('renders with default props', () => {
    const { getByTestId } = render(
      <IconTile data-testid='tile'>
        <svg />
      </IconTile>
    )
    const tile = getByTestId('tile')
    expect(tile).toBeInTheDocument()
    expect(tile.tagName.toLowerCase()).toBe('div')
    expect(tile).not.toHaveClass('intent-neutral')
    // Default emphasis is subtle, default size is md, default shape is square
    // (md square => rounded-xl)
    expect(tile).toHaveClass('emphasis-subtle', 'size-10', 'rounded-xl')
    expect(tile).not.toHaveClass('rounded-full')
  })

  it('renders icon children', () => {
    const { getByTestId, container } = render(
      <IconTile data-testid='tile'>
        <svg data-testid='icon' />
      </IconTile>
    )
    expect(getByTestId('tile')).toContainElement(getByTestId('icon'))
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders with different intents', () => {
    const { rerender, getByTestId } = render(
      <IconTile intent='accent' data-testid='tile'>
        <svg />
      </IconTile>
    )
    expect(getByTestId('tile')).toHaveClass('intent-accent')

    rerender(
      <IconTile intent='danger' data-testid='tile'>
        <svg />
      </IconTile>
    )
    expect(getByTestId('tile')).toHaveClass('intent-danger')
  })

  it('renders with different emphasis', () => {
    const { rerender, getByTestId } = render(
      <IconTile emphasis='strong' data-testid='tile'>
        <svg />
      </IconTile>
    )
    expect(getByTestId('tile')).toHaveClass('emphasis-strong')

    rerender(
      <IconTile emphasis='subtler' data-testid='tile'>
        <svg />
      </IconTile>
    )
    expect(getByTestId('tile')).toHaveClass('emphasis-subtler')
  })

  it('uses text-subtle for every emphasis except strong', () => {
    const { rerender, getByTestId } = render(
      <IconTile emphasis='strong' data-testid='tile'>
        <svg />
      </IconTile>
    )
    // strong inverts its own text — no text-subtle
    expect(getByTestId('tile')).not.toHaveClass('text-subtle')

    for (const emphasis of ['normal', 'subtle', 'subtler'] as const) {
      rerender(
        <IconTile emphasis={emphasis} data-testid='tile'>
          <svg />
        </IconTile>
      )
      expect(getByTestId('tile')).toHaveClass('text-subtle')
    }
  })

  it('maps each size to a tile size-* box and icon size', () => {
    const cases = [
      ['xs', 'size-6', 'p-1'],
      ['sm', 'size-8', 'p-1.5'],
      ['md', 'size-10', 'p-2'],
      ['lg', 'size-12', 'p-2.5'],
      ['xl', 'size-14', 'p-3'],
      ['2xl', 'size-16', 'p-3.5'],
      ['3xl', 'size-20', 'p-4']
    ] as const

    const { rerender, getByTestId } = render(
      <IconTile data-testid='tile'>
        <svg />
      </IconTile>
    )

    for (const [size, sizeClass, padClass] of cases) {
      rerender(
        <IconTile size={size} data-testid='tile'>
          <svg />
        </IconTile>
      )
      expect(getByTestId('tile')).toHaveClass(sizeClass, padClass)
    }
  })

  it('renders a full-radius pill when shape="circle"', () => {
    const { getByTestId } = render(
      <IconTile shape='circle' data-testid='tile'>
        <svg />
      </IconTile>
    )
    expect(getByTestId('tile')).toHaveClass('rounded-full')
  })

  it('scales the square radius with size (the default shape)', () => {
    const cases = [
      ['xs', 'rounded-md'],
      ['sm', 'rounded-lg'],
      ['md', 'rounded-xl'],
      ['lg', 'rounded-xl'],
      ['xl', 'rounded-2xl'],
      ['2xl', 'rounded-2xl'],
      ['3xl', 'rounded-3xl']
    ] as const

    const { rerender, getByTestId } = render(
      <IconTile shape='square' data-testid='tile'>
        <svg />
      </IconTile>
    )

    for (const [size, radiusClass] of cases) {
      rerender(
        <IconTile shape='square' size={size} data-testid='tile'>
          <svg />
        </IconTile>
      )
      const tile = getByTestId('tile')
      expect(tile).toHaveClass(radiusClass)
      expect(tile).not.toHaveClass('rounded-full')
    }
  })

  it('applies custom className', () => {
    const { getByTestId } = render(
      <IconTile className='custom-class' data-testid='tile'>
        <svg />
      </IconTile>
    )
    expect(getByTestId('tile')).toHaveClass('custom-class')
  })

  it('forwards HTML attributes', () => {
    const { getByTestId } = render(
      <IconTile data-testid='tile' id='tile-1' aria-label='Settings'>
        <svg />
      </IconTile>
    )
    const tile = getByTestId('tile')
    expect(tile).toHaveAttribute('id', 'tile-1')
    expect(tile).toHaveAttribute('aria-label', 'Settings')
  })

  it('combines multiple props', () => {
    const { getByTestId } = render(
      <IconTile
        intent='accent'
        emphasis='strong'
        size='lg'
        className='extra'
        data-testid='tile'
      >
        <svg />
      </IconTile>
    )
    expect(getByTestId('tile')).toHaveClass(
      'intent-accent',
      'emphasis-strong',
      'size-12',
      'extra'
    )
  })
})
