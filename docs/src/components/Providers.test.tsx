// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { Button } from '@oztix/roadie-components/button'

import { Providers } from './Providers'

vi.mock('next/link', () => ({
  default: ({ href, ...props }: { href: string }) => (
    <a href={href} data-routed='' {...props} />
  )
}))

beforeAll(() => {
  vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/roadie')
  window.matchMedia ??= (query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {}
    }) as unknown as MediaQueryList
})

afterEach(cleanup)

function linkTo(href: string) {
  render(
    <Providers>
      <Button href={href}>Go</Button>
    </Providers>
  )
  return screen.getByRole('link', { name: 'Go' })
}

describe('DocsLink', () => {
  it('routes a page through Next', () => {
    expect(linkTo('/overview/ai').hasAttribute('data-routed')).toBe(true)
  })

  it('loads a static file plainly under the base path', () => {
    for (const href of ['/components/button.md', '/llms.txt?v=1']) {
      const link = linkTo(href)
      expect(link.hasAttribute('data-routed')).toBe(false)
      expect(link.getAttribute('href')).toBe(`/roadie${href}`)
      cleanup()
    }
  })
})
