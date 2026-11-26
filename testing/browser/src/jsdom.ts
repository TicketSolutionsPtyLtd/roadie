class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class IntersectionObserverMock {
  readonly root = null
  readonly rootMargin = ''
  readonly thresholds: ReadonlyArray<number> = []
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

// jsdom has no layout: these observers never fire and every box measures 0.
// Locking them makes a test that fakes either throw where it stubs, by a
// setter (assignment) or `Cannot redefine property` (vi.stubGlobal, vi.spyOn).
// A spy on one element or on a subclass prototype still gets through.
const NO_LAYOUT =
  'never fires or measures in jsdom. Test it in a *.browser.test.tsx.'

function descriptorOf(target: object | null, key: string) {
  for (let at = target; at; at = Object.getPrototypeOf(at)) {
    const descriptor = Object.getOwnPropertyDescriptor(at, key)
    if (descriptor) return descriptor
  }
}

function lock(target: object, key: string) {
  if (Object.getOwnPropertyDescriptor(target, key)?.configurable === false)
    return
  const descriptor = descriptorOf(target, key)
  if (!descriptor) return
  const { value } = descriptor
  Object.defineProperty(target, key, {
    configurable: false,
    enumerable: descriptor.enumerable,
    get: descriptor.get ?? (() => value),
    set() {
      throw new TypeError(`${key} ${NO_LAYOUT}`)
    }
  })
}

/**
 * For a jsdom setup file: installs observers that never fire, then locks
 * them and every geometry read, so a test can't fake layout. Call it once,
 * at the top level.
 */
export function lockLayout() {
  // Embla reads IntersectionObserver from the document's own window.
  // getComputedStyle stays unlocked: the jsdom environment deletes it on
  // teardown.
  for (const view of new Set([globalThis, document.defaultView!])) {
    Object.assign(view, {
      ResizeObserver: ResizeObserverMock,
      IntersectionObserver: IntersectionObserverMock
    })
    lock(view, 'ResizeObserver')
    lock(view, 'IntersectionObserver')
  }
  for (const proto of [Element.prototype, HTMLElement.prototype]) {
    for (const key of [
      'getBoundingClientRect',
      'getClientRects',
      'clientWidth',
      'clientHeight',
      'scrollWidth',
      'scrollHeight'
    ])
      lock(proto, key)
  }
  for (const key of ['offsetWidth', 'offsetHeight', 'offsetLeft', 'offsetTop'])
    lock(HTMLElement.prototype, key)
}
