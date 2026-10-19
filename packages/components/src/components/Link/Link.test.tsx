import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  type RoadieLinkComponent,
  RoadieLinkProvider
} from '../../providers/RoadieLinkProvider'
import { Link } from './index'

const StubLink: RoadieLinkComponent = ({ href, children, ...rest }) => (
  <a data-router='stub' href={href} {...rest}>
    {children}
  </a>
)

describe('Link', () => {
  it('routes an internal href through the provider’s Link', () => {
    render(
      <RoadieLinkProvider Link={StubLink}>
        <Link href='/events/123'>Ochre Kite Weekender</Link>
      </RoadieLinkProvider>
    )
    const link = screen.getByRole('link', { name: 'Ochre Kite Weekender' })
    expect(link).toHaveAttribute('data-router', 'stub')
    expect(link).toHaveAttribute('href', '/events/123')
  })

  it('opens an external href in a new tab', () => {
    render(<Link href='https://example.com'>Example</Link>)
    const link = screen.getByRole('link', { name: 'Example' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('refuses an unsafe href', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<Link href='javascript:alert(1)'>Unsafe</Link>)
    expect(screen.getByRole('link', { name: 'Unsafe' })).toHaveAttribute(
      'href',
      '#'
    )
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })
})
