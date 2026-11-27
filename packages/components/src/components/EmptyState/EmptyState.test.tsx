import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EmptyStateActions } from './EmptyStateActions'
import { EmptyStateDescription } from './EmptyStateDescription'
import { EmptyStateIconTile } from './EmptyStateIconTile'
import { EmptyStateIllustration } from './EmptyStateIllustration'
import { EmptyStateRoot } from './EmptyStateRoot'
import { EmptyStateTitle } from './EmptyStateTitle'
import { EmptyState } from './index'

describe('EmptyStateRoot', () => {
  it('renders a centered container with the empty-state slot', () => {
    render(<EmptyStateRoot>content</EmptyStateRoot>)
    const root = screen.getByText('content')
    expect(root).toHaveAttribute('data-slot', 'empty-state')
    // gap-6 is the wider gap separating media / message / actions at md
    expect(root).toHaveClass('grid', 'justify-items-center', 'gap-6', 'py-12')
  })

  it('applies size to the root layout and names it for the parts', () => {
    render(<EmptyStateRoot size='lg'>page</EmptyStateRoot>)
    expect(screen.getByText('page')).toHaveClass('py-16')
    expect(screen.getByText('page')).toHaveAttribute('data-size', 'lg')
  })

  it('keeps data-size in step with size, whatever the props say', () => {
    render(
      <EmptyStateRoot size='sm' {...{ 'data-size': 'lg' }}>
        small
      </EmptyStateRoot>
    )
    expect(screen.getByText('small')).toHaveAttribute('data-size', 'sm')
  })

  it('names the default size too, so a nested root scopes its parts', () => {
    render(<EmptyStateRoot>plain</EmptyStateRoot>)
    expect(screen.getByText('plain')).toHaveAttribute('data-size', 'md')
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
  it('renders an h2 with the title slot', () => {
    render(
      <EmptyStateRoot size='lg'>
        <EmptyStateTitle>No events yet</EmptyStateTitle>
      </EmptyStateRoot>
    )
    const title = screen.getByRole('heading', { name: 'No events yet' })
    expect(title.tagName).toBe('H2')
    expect(title).toHaveAttribute('data-slot', 'empty-state-title')
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
    expect(desc).toHaveClass('text-subtle', 'tracking-prose')
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

  it('takes the size of the nearest root', () => {
    render(
      <EmptyStateRoot size='sm'>
        <EmptyStateRoot size='lg'>
          <EmptyStateIconTile aria-label='inner' />
        </EmptyStateRoot>
      </EmptyStateRoot>
    )
    // lg → 3xl tile (size-20)
    expect(screen.getByLabelText('inner')).toHaveClass('size-20')
  })
})

describe('EmptyStateIllustration', () => {
  it('wraps the media in the illustration slot', () => {
    render(
      <EmptyStateRoot size='lg'>
        <EmptyStateIllustration data-testid='media'>
          <svg />
        </EmptyStateIllustration>
      </EmptyStateRoot>
    )
    const wrapper = screen.getByTestId('media')
    expect(wrapper).toHaveAttribute('data-slot', 'empty-state-illustration')
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
