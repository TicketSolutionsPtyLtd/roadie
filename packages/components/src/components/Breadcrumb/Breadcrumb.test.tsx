import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Breadcrumb } from '.'

describe('Breadcrumb', () => {
  it('Breadcrumb and Breadcrumb.Root are the same component reference', () => {
    expect(Breadcrumb).toBe(Breadcrumb.Root)
  })

  it('renders bare <Breadcrumb> root as nav with aria-label', () => {
    const { container } = render(
      <Breadcrumb>
        <Breadcrumb.List>
          <Breadcrumb.Item>
            <Breadcrumb.Link href='/'>Home</Breadcrumb.Link>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb>
    )
    expect(container.querySelector('nav')).toHaveAttribute(
      'aria-label',
      'Breadcrumb'
    )
  })

  it('renders <Breadcrumb.Root> alias as nav with aria-label', () => {
    const { container } = render(
      <Breadcrumb.Root>
        <Breadcrumb.List>
          <Breadcrumb.Item>
            <Breadcrumb.Link href='/'>Home</Breadcrumb.Link>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb.Root>
    )
    const nav = container.querySelector('nav')!
    expect(nav).toBeInTheDocument()
    expect(nav).toHaveAttribute('aria-label', 'Breadcrumb')
  })

  it('renders List sub-component', () => {
    const { container } = render(
      <Breadcrumb>
        <Breadcrumb.List>
          <Breadcrumb.Item>
            <Breadcrumb.Link href='/'>Home</Breadcrumb.Link>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb>
    )
    const ol = container.querySelector('ol')!
    expect(ol).toBeInTheDocument()
    expect(ol).toHaveClass('flex', 'items-center', 'gap-2', 'text-sm')
  })

  it('renders Item sub-component', () => {
    const { container } = render(
      <Breadcrumb>
        <Breadcrumb.List>
          <Breadcrumb.Item>
            <Breadcrumb.Link href='/'>Home</Breadcrumb.Link>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb>
    )
    const li = container.querySelector('li')!
    expect(li).toBeInTheDocument()
    expect(li).toHaveClass('flex', 'items-center', 'gap-2')
  })

  it('renders Link sub-component', () => {
    const { getByText } = render(
      <Breadcrumb>
        <Breadcrumb.List>
          <Breadcrumb.Item>
            <Breadcrumb.Link href='/home'>Home</Breadcrumb.Link>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb>
    )
    const link = getByText('Home')
    expect(link).toBeInTheDocument()
    expect(link.tagName.toLowerCase()).toBe('a')
    expect(link).toHaveAttribute('href', '/home')
    expect(link).toHaveClass('text-subtle')
  })

  it('renders Separator with default slash', () => {
    const { getByText } = render(
      <Breadcrumb>
        <Breadcrumb.List>
          <Breadcrumb.Item>
            <Breadcrumb.Link href='/'>Home</Breadcrumb.Link>
            <Breadcrumb.Separator />
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb>
    )
    const separator = getByText('/')
    expect(separator).toBeInTheDocument()
    expect(separator).toHaveAttribute('role', 'presentation')
    expect(separator).toHaveClass('text-subtler')
  })

  it('renders Separator with custom children', () => {
    const { getByText } = render(
      <Breadcrumb>
        <Breadcrumb.List>
          <Breadcrumb.Item>
            <Breadcrumb.Separator>&gt;</Breadcrumb.Separator>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb>
    )
    expect(getByText('>')).toBeInTheDocument()
  })

  it('renders Current sub-component with aria-current', () => {
    const { getByText } = render(
      <Breadcrumb>
        <Breadcrumb.List>
          <Breadcrumb.Item>
            <Breadcrumb.Current>Current Page</Breadcrumb.Current>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb>
    )
    const current = getByText('Current Page')
    expect(current).toBeInTheDocument()
    expect(current).toHaveAttribute('aria-current', 'page')
    expect(current).toHaveClass('text-normal', 'font-medium')
  })

  it('renders Link with custom component via as prop', () => {
    function CustomLink(props: React.ComponentProps<'a'>) {
      return <a data-custom='true' {...props} />
    }
    const { getByText } = render(
      <Breadcrumb>
        <Breadcrumb.List>
          <Breadcrumb.Item>
            <Breadcrumb.Link as={CustomLink} href='/home'>
              Home
            </Breadcrumb.Link>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb>
    )
    const link = getByText('Home')
    expect(link.tagName.toLowerCase()).toBe('a')
    expect(link).toHaveAttribute('data-custom', 'true')
    expect(link).toHaveAttribute('href', '/home')
    expect(link).toHaveClass('text-subtle')
  })

  it('applies custom className to sub-components', () => {
    const { container } = render(
      <Breadcrumb className='custom-nav'>
        <Breadcrumb.List className='custom-list'>
          <Breadcrumb.Item className='custom-item'>
            <Breadcrumb.Link href='/' className='custom-link'>
              Home
            </Breadcrumb.Link>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb>
    )
    expect(container.querySelector('nav')).toHaveClass('custom-nav')
    expect(container.querySelector('ol')).toHaveClass('custom-list')
    expect(container.querySelector('li')).toHaveClass('custom-item')
    expect(container.querySelector('a')).toHaveClass('custom-link')
  })
})
