/** Runs once the page is idle, or soon where the browser can't say when. */
export function whenIdle(run: () => void) {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(() => run(), { timeout: 2000 })
    return () => cancelIdleCallback(id)
  }
  const id = setTimeout(run, 200)
  return () => clearTimeout(id)
}
