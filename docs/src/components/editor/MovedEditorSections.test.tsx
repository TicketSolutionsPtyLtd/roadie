// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MovedEditorSections } from './MovedEditorSections'

const replace = vi.fn()
let pathname = '/components/editor/'

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace })
}))

function visit(path: string, hash: string) {
  pathname = path
  window.location.hash = hash
  render(<MovedEditorSections />)
}

afterEach(() => {
  cleanup()
  replace.mockClear()
  window.location.hash = ''
})

describe('MovedEditorSections', () => {
  it('sends an old anchor on the Editor page to the page it moved to', () => {
    visit('/components/editor/', '#merge-tags')
    expect(replace).toHaveBeenCalledExactlyOnceWith(
      '/components/editor/email/#merge-tags'
    )
  })

  it('matches the Editor page without its trailing slash', () => {
    visit('/components/editor', '#html-emails')
    expect(replace).toHaveBeenCalledExactlyOnceWith(
      '/components/editor/email/#html-emails'
    )
  })

  it('leaves an anchor the Editor page still has', () => {
    visit('/components/editor/', '#accessibility')
    expect(replace).not.toHaveBeenCalled()
  })

  it('leaves the same anchor on another page', () => {
    visit('/components/editor/email/', '#merge-tags')
    expect(replace).not.toHaveBeenCalled()
  })
})
