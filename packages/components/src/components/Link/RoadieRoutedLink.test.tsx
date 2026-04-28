import { createRef } from 'react'

import '@testing-library/jest-dom/vitest'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  type RoadieLinkComponent,
  RoadieLinkProvider
} from '../../providers/RoadieLinkProvider'
import { RoadieRoutedLink } from './RoadieRoutedLink'

const StubLink: RoadieLinkComponent = ({ href, children, ...rest }) => (
  <a data-testid='stub-link' href={href} {...rest}>
    {children}
  </a>
)

describe('RoadieRoutedLink', () => {
  describe('without provider', () => {
    it('renders a plain anchor for an internal href', () => {
      const { getByTestId } = render(
        <RoadieRoutedLink data-testid='link' href='/events/123'>
          Events
        </RoadieRoutedLink>
      )
      const link = getByTestId('link')
      expect(link.tagName.toLowerCase()).toBe('a')
      expect(link).toHaveAttribute('href', '/events/123')
      expect(link).not.toHaveAttribute('target')
      expect(link).not.toHaveAttribute('rel')
    })

    it('falls back to a plain anchor when Link is null', () => {
      const { getByTestId } = render(
        <RoadieLinkProvider Link={null}>
          <RoadieRoutedLink data-testid='link' href='/x'>
            X
          </RoadieRoutedLink>
        </RoadieLinkProvider>
      )
      const link = getByTestId('link')
      expect(link.tagName.toLowerCase()).toBe('a')
      expect(link).not.toHaveAttribute('data-testid', 'stub-link')
    })
  })

  describe('with provider', () => {
    it('renders the configured Link for an internal href', () => {
      const { getByTestId } = render(
        <RoadieLinkProvider Link={StubLink}>
          <RoadieRoutedLink href='/events/123'>Events</RoadieRoutedLink>
        </RoadieLinkProvider>
      )
      const link = getByTestId('stub-link')
      expect(link).toHaveAttribute('href', '/events/123')
    })

    it('forwards ref to the configured Link', () => {
      const ref = createRef<HTMLAnchorElement>()
      render(
        <RoadieLinkProvider Link={StubLink}>
          <RoadieRoutedLink ref={ref} href='/x'>
            X
          </RoadieRoutedLink>
        </RoadieLinkProvider>
      )
      expect(ref.current).not.toBeNull()
      expect(ref.current?.tagName.toLowerCase()).toBe('a')
    })

    it('forwards onClick to the configured Link', async () => {
      const onClick = vi.fn()
      const user = userEvent.setup()
      const { getByTestId } = render(
        <RoadieLinkProvider Link={StubLink}>
          <RoadieRoutedLink href='/x' onClick={onClick}>
            X
          </RoadieRoutedLink>
        </RoadieLinkProvider>
      )
      await user.click(getByTestId('stub-link'))
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('forwards className and data-* attributes', () => {
      const { getByTestId } = render(
        <RoadieLinkProvider Link={StubLink}>
          <RoadieRoutedLink href='/x' className='my-class' data-section='hero'>
            X
          </RoadieRoutedLink>
        </RoadieLinkProvider>
      )
      const link = getByTestId('stub-link')
      expect(link).toHaveClass('my-class')
      expect(link).toHaveAttribute('data-section', 'hero')
    })
  })

  describe('external hrefs', () => {
    it('renders a plain <a> for https:// and ignores the provider', () => {
      const { getByTestId, queryByTestId } = render(
        <RoadieLinkProvider Link={StubLink}>
          <RoadieRoutedLink data-testid='link' href='https://example.com'>
            Example
          </RoadieRoutedLink>
        </RoadieLinkProvider>
      )
      // Provider Link must NOT be invoked for external URLs
      expect(queryByTestId('stub-link')).toBeNull()
      const link = getByTestId('link')
      expect(link.tagName.toLowerCase()).toBe('a')
      expect(link).toHaveAttribute('href', 'https://example.com')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('renders a plain <a> for protocol-relative //', () => {
      const { getByTestId } = render(
        <RoadieRoutedLink data-testid='link' href='//example.com'>
          Example
        </RoadieRoutedLink>
      )
      const link = getByTestId('link')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('respects an explicit target override on external', () => {
      const { getByTestId } = render(
        <RoadieRoutedLink
          data-testid='link'
          href='https://example.com'
          target='_self'
        >
          Example
        </RoadieRoutedLink>
      )
      expect(getByTestId('link')).toHaveAttribute('target', '_self')
    })

    it('respects an explicit rel override on external', () => {
      const { getByTestId } = render(
        <RoadieRoutedLink
          data-testid='link'
          href='https://example.com'
          rel='nofollow'
        >
          Example
        </RoadieRoutedLink>
      )
      expect(getByTestId('link')).toHaveAttribute('rel', 'nofollow')
    })
  })

  describe('protocol hrefs', () => {
    it('renders a plain <a> for mailto: with no target or rel', () => {
      const { getByTestId, queryByTestId } = render(
        <RoadieLinkProvider Link={StubLink}>
          <RoadieRoutedLink data-testid='link' href='mailto:hello@oztix.com.au'>
            Email
          </RoadieRoutedLink>
        </RoadieLinkProvider>
      )
      expect(queryByTestId('stub-link')).toBeNull()
      const link = getByTestId('link')
      expect(link).toHaveAttribute('href', 'mailto:hello@oztix.com.au')
      expect(link).not.toHaveAttribute('target')
      expect(link).not.toHaveAttribute('rel')
    })

    it('renders a plain <a> for tel: regardless of provider', () => {
      const { getByTestId } = render(
        <RoadieLinkProvider Link={StubLink}>
          <RoadieRoutedLink data-testid='link' href='tel:+61400000000'>
            Call
          </RoadieRoutedLink>
        </RoadieLinkProvider>
      )
      const link = getByTestId('link')
      expect(link.tagName.toLowerCase()).toBe('a')
      expect(link).toHaveAttribute('href', 'tel:+61400000000')
    })
  })

  describe('external override', () => {
    it('external={false} forces internal routing through provider for an https:// href', () => {
      const { getByTestId, queryByTestId } = render(
        <RoadieLinkProvider Link={StubLink}>
          <RoadieRoutedLink href='https://oztix.com.au/events' external={false}>
            Events
          </RoadieRoutedLink>
        </RoadieLinkProvider>
      )
      const link = getByTestId('stub-link')
      expect(link).toHaveAttribute('href', 'https://oztix.com.au/events')
      expect(link).not.toHaveAttribute('target')
      expect(queryByTestId('link')).toBeNull()
    })

    it('external={true} forces external treatment for an internal-looking href', () => {
      const { getByTestId, queryByTestId } = render(
        <RoadieLinkProvider Link={StubLink}>
          <RoadieRoutedLink data-testid='link' href='/redirect/foo' external>
            Redirect
          </RoadieRoutedLink>
        </RoadieLinkProvider>
      )
      expect(queryByTestId('stub-link')).toBeNull()
      const link = getByTestId('link')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })
})
