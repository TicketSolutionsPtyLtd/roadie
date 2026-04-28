import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LinkButton } from '.'

describe('LinkButton', () => {
  it('renders as an anchor element', () => {
    const { getByText } = render(<LinkButton href='/about'>About</LinkButton>)
    const link = getByText('About')
    expect(link).toBeInTheDocument()
    expect(link.tagName.toLowerCase()).toBe('a')
    expect(link).toHaveAttribute('href', '/about')
  })

  it('applies default classes', () => {
    const { getByText } = render(<LinkButton href='/'>Link</LinkButton>)
    const link = getByText('Link')
    expect(link).toHaveClass('btn', 'is-interactive', 'btn-md')
  })

  it('renders with different emphasis', () => {
    const { rerender, getByText } = render(
      <LinkButton href='/' emphasis='strong' intent='accent'>
        Strong
      </LinkButton>
    )
    expect(getByText('Strong')).toHaveClass('emphasis-strong', 'intent-accent')

    rerender(
      <LinkButton href='/' emphasis='subtle'>
        Subtle
      </LinkButton>
    )
    expect(getByText('Subtle')).toHaveClass('emphasis-subtle')
  })

  it('renders with different sizes', () => {
    const { rerender, getByText } = render(
      <LinkButton href='/' size='sm'>
        Small
      </LinkButton>
    )
    expect(getByText('Small')).toHaveClass('btn-sm')

    rerender(
      <LinkButton href='/' size='lg'>
        Large
      </LinkButton>
    )
    expect(getByText('Large')).toHaveClass('btn-lg')
  })

  it('renders with different intents', () => {
    const { getByText } = render(
      <LinkButton href='/' intent='danger'>
        Danger
      </LinkButton>
    )
    expect(getByText('Danger')).toHaveClass('intent-danger')
  })

  it('applies custom className', () => {
    const { getByText } = render(
      <LinkButton href='/' className='custom-class'>
        Custom
      </LinkButton>
    )
    expect(getByText('Custom')).toHaveClass('custom-class')
  })

  it('preserves brand-secondary intent literal', () => {
    const { getByText } = render(
      <LinkButton href='/' intent='brand-secondary'>
        Brand2
      </LinkButton>
    )
    expect(getByText('Brand2')).toHaveClass('intent-brand-secondary')
  })

  it('renders with a custom component via as prop', () => {
    function CustomLink(props: React.ComponentProps<'a'>) {
      return <a data-custom='true' {...props} />
    }

    const { getByText } = render(
      <LinkButton as={CustomLink} href='/about'>
        Custom
      </LinkButton>
    )
    const link = getByText('Custom')
    expect(link).toHaveAttribute('data-custom', 'true')
    expect(link).toHaveClass('btn')
  })
})
