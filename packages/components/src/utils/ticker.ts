/**
 * One interval for everything on the page that re-renders on a clock:
 * countdowns, and relative timestamps.
 *
 * A list of audit rows or pre-registration cards would otherwise start an
 * interval each, all firing at slightly different offsets. This starts on the first subscriber and
 * stops on the last, and stops entirely while the tab is hidden so a background
 * page costs nothing.
 */

type Listener = () => void

const listeners = new Set<Listener>()
let intervalId: ReturnType<typeof setInterval> | null = null

function tick() {
  for (const listener of listeners) listener()
}

function start() {
  if (intervalId !== null) return
  if (typeof document !== 'undefined' && document.hidden) return
  intervalId = setInterval(tick, 1000)
}

function stop() {
  if (intervalId === null) return
  clearInterval(intervalId)
  intervalId = null
}

function onVisibilityChange() {
  if (document.hidden) {
    stop()
  } else {
    // Catch up in one render rather than replaying the missed seconds.
    start()
    tick()
  }
}

export function subscribeToTicker(listener: Listener): () => void {
  if (listeners.size === 0) {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange)
    }
    start()
  }
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange)
      }
      stop()
    }
  }
}

/** Test seam. Not exported from the package. */
export function _tickerState() {
  return { listeners: listeners.size, running: intervalId !== null }
}
