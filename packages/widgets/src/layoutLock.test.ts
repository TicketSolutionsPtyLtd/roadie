import { afterEach, describe, expect, it, vi } from 'vitest'

// jsdom has no layout, so a widget test that fakes a size or an observer
// passes without measuring anything. The setup file locks every way to fake one.
describe('the jsdom layout lock', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it.each([
    ['getBoundingClientRect', Element.prototype],
    ['clientWidth', Element.prototype],
    ['offsetHeight', HTMLElement.prototype]
  ] as const)('refuses a faked %s', (key, proto) => {
    expect(() =>
      Object.defineProperty(proto, key, { value: () => 100 })
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
})
