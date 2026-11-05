// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ReleaseMoved } from './ReleaseMoved'

afterEach(cleanup)

describe('ReleaseMoved', () => {
  it('refreshes to the release’s dated page, and links to it for anyone it doesn’t', () => {
    render(<ReleaseMoved href='/overview/changelog/2026-11-05' />)
    expect(
      document
        .querySelector('meta[http-equiv="refresh"]')
        ?.getAttribute('content')
    ).toBe('0; url=/overview/changelog/2026-11-05/')
    expect(
      screen.getByRole('link', { name: 'its own page' }).getAttribute('href')
    ).toBe('/overview/changelog/2026-11-05')
  })
})
