import { type ReactNode, createRef, useEffect } from 'react'

import '@testing-library/jest-dom/vitest'
import { fireEvent, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  type PendingNavigationStore,
  usePendingNavigationStore
} from '../../providers/PendingNavigationContext'
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
  // Bubble phase: a capturing listener would read as already cancelled.
  const preventNavigation = (event: Event) => event.preventDefault()
  beforeEach(() => document.addEventListener('click', preventNavigation))
  afterEach(() => document.removeEventListener('click', preventNavigation))

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
    it.each<[string]>([
      ['mailto:hello@oztix.com.au'],
      ['tel:+61400000000'],
      ['sms:+61400000000']
    ])(
      'renders a plain <a> for %s with no target/rel, ignoring provider',
      (href: string) => {
        const { getByTestId, queryByTestId } = render(
          <RoadieLinkProvider Link={StubLink}>
            <RoadieRoutedLink data-testid='link' href={href}>
              Contact
            </RoadieRoutedLink>
          </RoadieLinkProvider>
        )
        expect(queryByTestId('stub-link')).toBeNull()
        const link = getByTestId('link')
        expect(link.tagName.toLowerCase()).toBe('a')
        expect(link).toHaveAttribute('href', href)
        expect(link).not.toHaveAttribute('target')
        expect(link).not.toHaveAttribute('rel')
      }
    )
  })

  describe('unsafe protocols (XSS prevention)', () => {
    it('refuses javascript: hrefs and renders href="#"', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { getByTestId } = render(
        <RoadieRoutedLink data-testid='link' href='javascript:alert(1)'>
          Pwn
        </RoadieRoutedLink>
      )
      const link = getByTestId('link')
      expect(link.tagName.toLowerCase()).toBe('a')
      expect(link).toHaveAttribute('href', '#')
      expect(link).not.toHaveAttribute('target')
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn.mock.calls[0]?.[0]).toMatch(/unsafe href/i)
      warn.mockRestore()
    })

    it('refuses data: hrefs', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { getByTestId } = render(
        <RoadieRoutedLink
          data-testid='link'
          href='data:text/html,<script>alert(1)</script>'
        >
          Pwn
        </RoadieRoutedLink>
      )
      expect(getByTestId('link')).toHaveAttribute('href', '#')
    })

    it('refuses unsafe href even when provider is wired', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { getByTestId, queryByTestId } = render(
        <RoadieLinkProvider Link={StubLink}>
          <RoadieRoutedLink data-testid='link' href='javascript:alert(1)'>
            Pwn
          </RoadieRoutedLink>
        </RoadieLinkProvider>
      )
      expect(queryByTestId('stub-link')).toBeNull()
      expect(getByTestId('link')).toHaveAttribute('href', '#')
    })
  })

  describe('marking a navigation as pending', () => {
    const seen: { store: PendingNavigationStore | null } = { store: null }
    const keep = (store: PendingNavigationStore | null) => {
      seen.store = store
    }
    const Probe = () => {
      const store = usePendingNavigationStore()
      useEffect(() => keep(store), [store])
      return null
    }
    const clicked = (
      link: ReactNode,
      init?: Parameters<typeof fireEvent.click>[1]
    ) => {
      const { getByTestId } = render(
        <RoadieLinkProvider Link={StubLink}>
          <Probe />
          {link}
        </RoadieLinkProvider>
      )
      fireEvent.click(getByTestId('stub-link'), init)
      return seen.store?.get() ?? null
    }

    it('marks a plain click on an internal href', () => {
      expect(clicked(<RoadieRoutedLink href='/events' />)).not.toBeNull()
    })

    it('leaves a modified click to the browser', () => {
      expect(
        clicked(<RoadieRoutedLink href='/events' />, { metaKey: true })
      ).toBeNull()
    })

    it('leaves a middle click to the browser', () => {
      expect(
        clicked(<RoadieRoutedLink href='/events' />, { button: 1 })
      ).toBeNull()
    })

    it('leaves a link that opens elsewhere alone', () => {
      expect(
        clicked(<RoadieRoutedLink href='/events' target='_blank' />)
      ).toBeNull()
    })

    it('leaves a download link to the browser', () => {
      expect(
        clicked(<RoadieRoutedLink href='/events.ics' download />)
      ).toBeNull()
    })

    it('leaves a hash on this page alone', () => {
      expect(clicked(<RoadieRoutedLink href='#lineup' />)).toBeNull()
    })

    it('leaves a click the consumer cancelled alone', () => {
      expect(
        clicked(
          <RoadieRoutedLink
            href='/events'
            onClick={(event) => event.preventDefault()}
          />
        )
      ).toBeNull()
    })

    it('still calls the consumer\u2019s handler', () => {
      const onClick = vi.fn()
      clicked(<RoadieRoutedLink href='/events' onClick={onClick} />)
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('marks nothing for an external or a protocol href', () => {
      const { getByTestId } = render(
        <RoadieLinkProvider Link={StubLink}>
          <Probe />
          <RoadieRoutedLink data-testid='away' href='https://oztix.com.au' />
          <RoadieRoutedLink data-testid='mail' href='mailto:hi@oztix.com.au' />
        </RoadieLinkProvider>
      )
      fireEvent.click(getByTestId('away'))
      fireEvent.click(getByTestId('mail'))
      expect(seen.store?.get() ?? null).toBeNull()
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
