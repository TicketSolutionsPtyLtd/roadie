import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EmptyStateActions } from './EmptyStateActions'
import { EmptyStateDescription } from './EmptyStateDescription'
import { EmptyStateIconTile } from './EmptyStateIconTile'
import { EmptyStateIllustration } from './EmptyStateIllustration'
import { EmptyStateRoot } from './EmptyStateRoot'
import { EmptyStateTitle } from './EmptyStateTitle'
import { EmptyState } from './index'
import { emptyStateTitleVariants, emptyStateVariants } from './variants'

describe('EmptyStateRoot', () => {
  it('renders a centered container with the empty-state slot', () => {
    render(<EmptyStateRoot>content</EmptyStateRoot>)
    const root = screen.getByText('content')
    expect(root).toHaveAttribute('data-slot', 'empty-state')
    // gap-6 is the wider gap separating media / message / actions at md
    expect(root).toHaveClass('grid', 'justify-items-center', 'gap-6', 'py-12')
  })

  it('applies size to the root layout', () => {
    render(<EmptyStateRoot size='lg'>page</EmptyStateRoot>)
    expect(screen.getByText('page')).toHaveClass('py-16')
  })

  it('merges a custom className', () => {
    render(<EmptyStateRoot className='mt-10'>x</EmptyStateRoot>)
    expect(screen.getByText('x')).toHaveClass('mt-10')
  })

  it('applies the intent prop so descendants inherit the palette', () => {
    render(<EmptyStateRoot intent='accent'>tinted</EmptyStateRoot>)
    expect(screen.getByText('tinted')).toHaveClass('intent-accent')
  })

  it('sets no intent class when intent is omitted (cascades from ancestor)', () => {
    render(<EmptyStateRoot>plain</EmptyStateRoot>)
    expect(screen.getByText('plain').className).not.toMatch(/intent-/)
  })
})

describe('EmptyStateTitle', () => {
  it('renders an h2 with the title slot, type-scaled by context', () => {
    render(
      <EmptyStateRoot size='lg'>
        <EmptyStateTitle>No events yet</EmptyStateTitle>
      </EmptyStateRoot>
    )
    const title = screen.getByRole('heading', { name: 'No events yet' })
    expect(title.tagName).toBe('H2')
    expect(title).toHaveAttribute('data-slot', 'empty-state-title')
    expect(title).toHaveClass('text-display-prose-2')
  })

  it('honors a render override for heading level', () => {
    render(
      <EmptyStateRoot>
        <EmptyStateTitle render={<h1 />}>Page gone</EmptyStateTitle>
      </EmptyStateRoot>
    )
    const heading = screen.getByRole('heading', { name: 'Page gone' })
    expect(heading.tagName).toBe('H1')
    expect(heading).toHaveClass('text-display-ui-3')
  })
})

describe('EmptyStateDescription', () => {
  it('renders subtle prose body copy', () => {
    render(
      <EmptyStateRoot size='sm'>
        <EmptyStateDescription>Check back soon.</EmptyStateDescription>
      </EmptyStateRoot>
    )
    const desc = screen.getByText('Check back soon.')
    expect(desc.tagName).toBe('P')
    expect(desc).toHaveAttribute('data-slot', 'empty-state-description')
    expect(desc).toHaveClass('text-subtle', 'tracking-prose', 'text-sm/prose')
  })

  it('scales the body size across sizes while keeping prose leading', () => {
    const { rerender } = render(
      <EmptyStateRoot size='md'>
        <EmptyStateDescription>Body</EmptyStateDescription>
      </EmptyStateRoot>
    )
    expect(screen.getByText('Body')).toHaveClass('text-base/prose', 'max-w-md')
    rerender(
      <EmptyStateRoot size='lg'>
        <EmptyStateDescription>Body</EmptyStateDescription>
      </EmptyStateRoot>
    )
    expect(screen.getByText('Body')).toHaveClass('text-lg/prose', 'max-w-lg')
  })

  it('tightens toward a preceding title via a negative-margin sibling rule', () => {
    render(
      <EmptyStateRoot size='md'>
        <EmptyStateTitle>Title</EmptyStateTitle>
        <EmptyStateDescription>Body</EmptyStateDescription>
      </EmptyStateRoot>
    )
    expect(screen.getByText('Body')).toHaveClass(
      '[[data-slot=empty-state-title]+&]:-mt-4'
    )
  })
})

describe('EmptyStateIconTile', () => {
  it('maps the empty-state size to a circular IconTile size', () => {
    render(
      <EmptyStateRoot size='sm'>
        <EmptyStateIconTile aria-label='calendar' />
      </EmptyStateRoot>
    )
    const tile = screen.getByLabelText('calendar')
    expect(tile).toHaveAttribute('data-slot', 'empty-state-icon-tile')
    // sm → xl tile (size-14) + circle
    expect(tile).toHaveClass('size-14', 'rounded-full')
  })

  it('lets an explicit size override the mapping', () => {
    render(
      <EmptyStateRoot size='sm'>
        <EmptyStateIconTile size='md' aria-label='override' />
      </EmptyStateRoot>
    )
    expect(screen.getByLabelText('override')).toHaveClass('size-10')
  })
})

describe('EmptyStateIllustration', () => {
  it('scales the media wrapper with context size', () => {
    render(
      <EmptyStateRoot size='lg'>
        <EmptyStateIllustration data-testid='media'>
          <svg />
        </EmptyStateIllustration>
      </EmptyStateRoot>
    )
    const wrapper = screen.getByTestId('media')
    expect(wrapper).toHaveAttribute('data-slot', 'empty-state-illustration')
    expect(wrapper).toHaveClass('max-w-md')
  })
})

describe('EmptyStateActions', () => {
  it('renders a centered action row holding its children', () => {
    render(
      <EmptyStateActions>
        <button>Back to home</button>
      </EmptyStateActions>
    )
    const actions = screen.getByRole('button', {
      name: 'Back to home'
    }).parentElement
    expect(actions).toHaveAttribute('data-slot', 'empty-state-actions')
    expect(actions).toHaveClass('flex', 'justify-center')
  })
})

describe('emptyStateVariants', () => {
  it('defaults to md spacing', () => {
    expect(emptyStateVariants()).toContain('py-12')
  })

  it('scales padding with size', () => {
    expect(emptyStateVariants({ size: 'sm' })).toContain('py-8')
    expect(emptyStateVariants({ size: 'lg' })).toContain('py-16')
  })

  it('title type scales: ui at sm/md, prose at lg', () => {
    expect(emptyStateTitleVariants({ size: 'sm' })).toContain(
      'text-display-ui-5'
    )
    expect(emptyStateTitleVariants({ size: 'md' })).toContain(
      'text-display-ui-3'
    )
    expect(emptyStateTitleVariants({ size: 'lg' })).toContain(
      'text-display-prose-2'
    )
  })
})

describe('EmptyState namespace', () => {
  it('EmptyState and EmptyState.Root are the same reference', () => {
    expect(EmptyState).toBe(EmptyState.Root)
  })

  it('exposes every sub-component', () => {
    expect(EmptyState.IconTile).toBeTypeOf('function')
    expect(EmptyState.Illustration).toBeTypeOf('function')
    expect(EmptyState.Title).toBeTypeOf('function')
    expect(EmptyState.Description).toBeTypeOf('function')
    expect(EmptyState.Actions).toBeTypeOf('function')
  })

  it('composes a full empty state', () => {
    render(
      <EmptyState size='md'>
        <EmptyState.IconTile aria-label='empty' />
        <EmptyState.Title>No events yet</EmptyState.Title>
        <EmptyState.Description>Check back soon.</EmptyState.Description>
        <EmptyState.Actions>
          <button>Back to home</button>
        </EmptyState.Actions>
      </EmptyState>
    )
    expect(
      screen.getByRole('heading', { name: 'No events yet' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Back to home' })
    ).toBeInTheDocument()
  })
})
