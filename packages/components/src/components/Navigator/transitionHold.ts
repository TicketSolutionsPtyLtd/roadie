// Properties whose transition resizes boxes frame by frame; a fade or a slide never does.
const LAYOUT_PROPERTY =
  /^(width|height|min-|max-|padding|margin|inset|top|right|bottom|left|grid-template)/

// A transition that never ends, its element hidden say, can't hold forever.
const LONGEST_HOLD_MS = 1000

type TransitionLike = Event & { propertyName?: string }

/**
 * Defers `apply` while a layout transition runs anywhere inside `scope`, then
 * runs it once when the last one ends. Otherwise it runs at once.
 */
export function holdDuringLayoutTransitions(scope: Element, apply: () => void) {
  const running = new Map<EventTarget, Set<string>>()
  let pending = false
  let fallback: ReturnType<typeof setTimeout> | undefined

  const flush = () => {
    clearTimeout(fallback)
    running.clear()
    if (!pending) return
    pending = false
    apply()
  }

  const onRun = (event: TransitionLike) => {
    const property = event.propertyName ?? ''
    if (!event.target || !LAYOUT_PROPERTY.test(property)) return
    const properties = running.get(event.target) ?? new Set()
    properties.add(property)
    running.set(event.target, properties)
    clearTimeout(fallback)
    fallback = setTimeout(flush, LONGEST_HOLD_MS)
  }

  const onEnd = (event: TransitionLike) => {
    const properties = event.target ? running.get(event.target) : undefined
    if (!properties?.delete(event.propertyName ?? '')) return
    if (properties.size === 0 && event.target) running.delete(event.target)
    if (running.size === 0) flush()
  }

  scope.addEventListener('transitionrun', onRun)
  scope.addEventListener('transitionend', onEnd)
  scope.addEventListener('transitioncancel', onEnd)

  return {
    schedule() {
      if (running.size > 0) pending = true
      else apply()
    },
    dispose() {
      clearTimeout(fallback)
      scope.removeEventListener('transitionrun', onRun)
      scope.removeEventListener('transitionend', onEnd)
      scope.removeEventListener('transitioncancel', onEnd)
    }
  }
}
