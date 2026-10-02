'use client'

import {
  type RefObject,
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'

export const DEFAULT_PREVIEW_HEIGHT = 160

/** Measured preview heights for this session, so a revisit reserves the real space. */
export const exampleHeights = new Map<string, number>()

const SCROLLS = /^(?:auto|scroll|overlay)$/

// A mount that never reports (a chunk that fails to load) mustn't stall the queue.
const MOUNT_TIMEOUT_MS = 2000

/** The nearest ancestor that scrolls vertically, or null for the document. */
export function scrollParentOf(element: Element): Element | null {
  for (let node = element.parentElement; node; node = node.parentElement) {
    // overflow-x alone computes overflow-y to auto too, so require vertical room.
    if (
      node.scrollHeight > node.clientHeight &&
      SCROLLS.test(getComputedStyle(node).overflowY)
    )
      return node
  }
  return null
}

type Waiting = { mount: () => void }

// Examples within reach but not yet mounted. The observer keeps this current
// even while mounting is paused, so a jump mounts only where it lands.
const waiting = new Map<Element, Waiting>()
const watched = new Map<Element, Waiting & { root: Element | null }>()
const observers = new Map<Element | null, IntersectionObserver>()
let pauses = 0
let busy = false
let frame = 0

function distanceFromView(element: Element) {
  const { top, bottom } = element.getBoundingClientRect()
  if (bottom < 0) return -bottom
  if (top > window.innerHeight) return top - window.innerHeight
  return 0
}

// One example per frame, nearest first, each after the last one committed,
// so a scroll pays for one mount at a time instead of a burst.
function schedule() {
  if (frame || busy || pauses > 0 || waiting.size === 0) return
  frame = requestAnimationFrame(() => {
    frame = 0
    if (busy || pauses > 0) return
    let nearest: Element | undefined
    let best = Infinity
    for (const element of waiting.keys()) {
      const distance = distanceFromView(element)
      if (distance < best) {
        best = distance
        nearest = element
      }
    }
    if (!nearest) return
    const { mount } = waiting.get(nearest)!
    stopWatching(nearest)
    busy = true
    mount()
  })
}

/** Called by an example once its first render commits, or gives up waiting. */
function mounted() {
  busy = false
  schedule()
}

function observerFor(root: Element | null) {
  let observer = observers.get(root)
  if (observer) return observer
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const watch = watched.get(entry.target)
        if (!watch) continue
        if (entry.isIntersecting) waiting.set(entry.target, watch)
        else waiting.delete(entry.target)
      }
      schedule()
    },
    // A screen and a half ahead each way, so an example is ready before it scrolls in.
    { root, rootMargin: '150% 0px' }
  )
  observers.set(root, observer)
  return observer
}

function stopWatching(element: Element) {
  const watch = watched.get(element)
  if (!watch) return
  watched.delete(element)
  waiting.delete(element)
  const observer = observers.get(watch.root)
  observer?.unobserve(element)
  if ([...watched.values()].some(({ root }) => root === watch.root)) return
  observer?.disconnect()
  observers.delete(watch.root)
}

function watch(element: Element, mount: () => void) {
  const root = scrollParentOf(element)
  watched.set(element, { root, mount })
  observerFor(root).observe(element)
  return () => stopWatching(element)
}

/**
 * Holds mounting during a programmatic scroll, so examples it flies past
 * don't render and push its target away. Call the returned function when the
 * scroll ends: only examples still in reach then mount.
 */
export function pauseLiveExamples(): () => void {
  pauses++
  let resumed = false
  return () => {
    if (resumed) return
    resumed = true
    pauses--
    schedule()
  }
}

/**
 * True once the element comes within reach of view and its turn in the mount
 * queue arrives; it stays true, so a rendered example isn't torn down. Call
 * the returned `onMounted` when the example's first render commits.
 */
export function useNearViewport<T extends Element>(
  eager = false
): [RefObject<T | null>, boolean, () => void] {
  const ref = useRef<T>(null)
  const [near, setNear] = useState(eager)
  // This example holds the queue's turn until its first render commits.
  const holdsTurn = useRef(false)

  useEffect(() => {
    const element = ref.current
    if (near || !element) return
    return watch(element, () => {
      holdsTurn.current = true
      startTransition(() => setNear(true))
    })
  }, [near])

  const onMounted = useCallback(() => {
    if (!holdsTurn.current) return
    holdsTurn.current = false
    mounted()
  }, [])

  useEffect(() => {
    if (!near) return
    const timeout = setTimeout(onMounted, MOUNT_TIMEOUT_MS)
    return () => clearTimeout(timeout)
  }, [near, onMounted])

  // An example unmounted mid-turn (a route change) frees the queue.
  useEffect(() => () => onMounted(), [onMounted])

  return [ref, near, onMounted]
}
