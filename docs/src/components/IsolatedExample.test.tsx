// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { ManifestExample } from '@/lib/example-manifest'

import { IsolatedExampleRoute } from './IsolatedExample'

vi.mock('next/navigation', () => ({
  usePathname: () => '/examples/components/badge/default/'
}))

vi.mock('./LazyLiveRunner', () => ({
  LazyLiveRunner: ({ code }: { code: string }) => <pre>{code}</pre>
}))

const BADGE: ManifestExample = {
  page: 'components/badge',
  pageTitle: 'Badge',
  id: 'default',
  href: '/examples/components/badge/default/',
  backHref: '/components/badge/#default',
  heading: 'Default',
  language: 'tsx-live',
  code: '<Badge>Badge</Badge>',
  previewLayout: undefined,
  bleed: false
}

beforeAll(() => vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/roadie'))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function respond(result: () => Promise<unknown>) {
  const fetch = vi.fn(result)
  vi.stubGlobal('fetch', fetch)
  render(<IsolatedExampleRoute />)
  return fetch
}

const json = (body: unknown, ok = true) =>
  Promise.resolve({ ok, json: () => Promise.resolve(body) })

describe('IsolatedExampleRoute', () => {
  it("renders the address's example from its page's JSON, with its title", async () => {
    const fetch = respond(() => json([{ ...BADGE, id: 'other' }, BADGE]))

    expect(await screen.findByText(BADGE.code)).toBeTruthy()
    expect(fetch).toHaveBeenCalledWith(
      '/roadie/example-code/components/badge.json'
    )
    await waitFor(() =>
      expect(document.title).toBe(
        'Default example, Badge | Roadie Design System'
      )
    )
  })

  for (const [name, result] of [
    ['an example the JSON lacks', () => json([{ ...BADGE, id: 'other' }])],
    ['a failed response', () => json(null, false)],
    ['a failed request', () => Promise.reject(new Error('offline'))]
  ] as const)
    it(`says the example couldn't load for ${name}`, async () => {
      respond(result)
      expect(
        await screen.findByText("This example couldn't load.")
      ).toBeTruthy()
    })
})
