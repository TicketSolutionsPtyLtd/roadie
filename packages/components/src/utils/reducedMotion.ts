export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function scrollToTop(element: Element | null | undefined) {
  element?.scrollTo({
    top: 0,
    behavior: prefersReducedMotion() ? 'auto' : 'smooth'
  })
}
