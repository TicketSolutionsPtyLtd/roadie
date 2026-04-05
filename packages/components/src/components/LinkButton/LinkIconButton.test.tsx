import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LinkIconButton } from '.'

describe('LinkIconButton', () => {
  it('renders as an anchor element', () => {
    const { getByRole } = render(
      <LinkIconButton href='/settings' aria-label='Settings'>
        +
      </LinkIconButton>
    )
    const link = getByRole('link')
    expect(link).toBeInTheDocument()
    expect(link.tagName.toLowerCase()).toBe('a')
    expect(link).toHaveAttribute('href', '/settings')
  })

  it('applies default icon-md size', () => {
    const { getByRole } = render(
      <LinkIconButton href='/' aria-label='Icon'>
        +
      </LinkIconButton>
    )
    expect(getByRole('link')).toHaveClass(
      'btn',
      'is-interactive',
      'btn-icon-md'
    )
  })

  it('renders with different emphasis', () => {
    const { getByRole } = render(
      <LinkIconButton
        href='/'
        emphasis='strong'
        intent='accent'
        aria-label='Strong'
      >
        +
      </LinkIconButton>
    )
    expect(getByRole('link')).toHaveClass('emphasis-strong', 'intent-accent')
  })

  it('renders with different sizes', () => {
    const { rerender, getByRole } = render(
      <LinkIconButton href='/' size='icon-sm' aria-label='Small'>
        +
      </LinkIconButton>
    )
    expect(getByRole('link')).toHaveClass('btn-icon-sm')

    rerender(
      <LinkIconButton href='/' size='icon-lg' aria-label='Large'>
        +
      </LinkIconButton>
    )
    expect(getByRole('link')).toHaveClass('btn-icon-lg')
  })

  it('renders with different intents', () => {
    const { getByRole } = render(
      <LinkIconButton href='/' intent='danger' aria-label='Danger'>
        +
      </LinkIconButton>
    )
    expect(getByRole('link')).toHaveClass('intent-danger')
  })

  it('applies custom className', () => {
    const { getByRole } = render(
      <LinkIconButton href='/' className='custom-class' aria-label='Custom'>
        +
      </LinkIconButton>
    )
    expect(getByRole('link')).toHaveClass('custom-class')
  })

  it('renders with a custom component via as prop', () => {
    function CustomLink(props: React.ComponentProps<'a'>) {
      return <a data-custom='true' {...props} />
    }

    const { getByRole } = render(
      <LinkIconButton as={CustomLink} href='/settings' aria-label='Settings'>
        +
      </LinkIconButton>
    )
    const link = getByRole('link')
    expect(link).toHaveAttribute('data-custom', 'true')
    expect(link).toHaveClass('btn')
  })
})
