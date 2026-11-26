import { describe, expect, it, vi } from 'vitest'

// The setup file locks fake layout out of jsdom; this fails if it stops.
describe('the jsdom layout lock', () => {
  it('refuses a faked size or a stubbed observer', () => {
    expect(() =>
      // The fake is what this asserts throws.
      // eslint-disable-next-line roadie/no-layout-fake-in-jsdom
      Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
        value: () => ({ width: 100 })
      })
    ).toThrow(TypeError)
    expect(() => vi.stubGlobal('IntersectionObserver', class {})).toThrow(
      TypeError
    )
  })
})
