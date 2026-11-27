import { afterEach, describe, expect, it, vi } from 'vitest'

// jsdom has no layout, so a chart test that fakes a size passes without
// measuring anything. The setup file locks every way to fake one.
describe('the jsdom layout lock', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it.each([
    ['getBoundingClientRect', Element.prototype],
    ['clientWidth', Element.prototype],
    ['offsetWidth', HTMLElement.prototype]
  ] as const)('refuses a faked %s', (key, proto) => {
    expect(() =>
      Object.defineProperty(proto, key, { value: () => ({ width: 100 }) })
    ).toThrow(TypeError)
  })

  it.each(['ResizeObserver', 'IntersectionObserver'])(
    'refuses a stubbed %s, on the global and the document’s window',
    (name) => {
      expect(() => vi.stubGlobal(name, class {})).toThrow(TypeError)
      expect(() =>
        Object.defineProperty(document.defaultView!, name, { value: class {} })
      ).toThrow(TypeError)
    }
  )

  it('keeps a ResizeObserver for charts that create one', () => {
    expect(() => new ResizeObserver(() => {}).disconnect()).not.toThrow()
  })
})
