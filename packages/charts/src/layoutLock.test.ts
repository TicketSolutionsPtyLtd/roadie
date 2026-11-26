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
    'refuses a stubbed %s',
    (name) => {
      expect(() => vi.stubGlobal(name, class {})).toThrow(TypeError)
    }
  )

  it('leaves an observer that never fires, for components that create one', () => {
    const callback = vi.fn()
    const observer = new ResizeObserver(callback)
    observer.observe(document.body)
    observer.disconnect()
    expect(callback).not.toHaveBeenCalled()
  })
})
