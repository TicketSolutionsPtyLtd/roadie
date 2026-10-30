'use client'

import {
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore
} from 'react'

import { useRoute } from '@/lib/route'

import { cn } from '@oztix/roadie-core/utils'

import { landOn } from './landOn'
import { scrollParentOf } from './nearViewport'

// A heading takes over once it rises into the top 30% of the scroller, below its scroll padding.
const ACTIVE_LINE = 0.3
// Smooth scroll usually settles in <500ms but we leave headroom for slow
// machines + the inertia tail before honouring scroll updates again.
const PROGRAMMATIC_SCROLL_LOCK_MS = 800

type Heading = { id: string; text: string; level: 2 | 3 }

export type DocHeadings = {
  headings: Heading[]
  onSelect: (event: MouseEvent<HTMLAnchorElement>, id: string) => void
}

// Outside React state, so a highlight re-renders only the lists that show it.
let activeHeading: string | null = null
const activeListeners = new Set<() => void>()

function setActiveHeading(id: string) {
  if (activeHeading === id) return
  activeHeading = id
  activeListeners.forEach((listener) => listener())
}

const subscribeActiveHeading = (listener: () => void) => {
  activeListeners.add(listener)
  return () => {
    activeListeners.delete(listener)
  }
}

const useActiveHeading = () =>
  useSyncExternalStore(
    subscribeActiveHeading,
    () => activeHeading,
    () => null
  )

const warned = new Set<string>()

function warnUnlinkable(heading: HTMLHeadingElement, text: string) {
  if (
    typeof process === 'undefined' ||
    process.env.NODE_ENV === 'production' ||
    warned.has(text)
  )
    return
  warned.add(text)
  console.warn(
    `On this page leaves out "${text}": give its heading ${heading.id ? 'an id no other heading has' : 'an id where it renders'}.`
  )
}

/** Headings and a scroll-to handler, lifted so the inspector renders only with two or more. Off while a page fills the inspector itself. */
export function useDocHeadings(enabled = true): DocHeadings {
  const route = useRoute()
  const [headings, setHeadings] = useState<Heading[]>([])

  // Tracks programmatic (click-driven) scrolls so the scroll tracking
  // doesn't briefly highlight headings that pass the active line while
  // smooth-scrolling toward the user's target.
  const programmaticScrollLockRef = useRef<number>(0)
  const elementsRef = useRef(new Map<string, HTMLHeadingElement>())
  // The hash last landed on or set by a click, so each change lands once.
  const seenHashRef = useRef('')

  useEffect(() => {
    // Clear on every bail-out, or the last page's headings linger.
    if (route === '/' || !enabled) {
      // eslint-disable-next-line react/set-state-in-effect -- reading DOM state on mount
      setHeadings([])
      return
    }
    // Scope to the content wrapper, not the Navigator's <main>.
    const found = document.getElementById('docs-content')
    if (!found) {
      setHeadings([])
      return
    }
    let mainEl: HTMLElement = found

    // These pages' h3s duplicate the navigation or run to dozens.
    const selector = ['/components', '/tokens/reference'].includes(route)
      ? 'h2'
      : 'h2, h3'
    // Read from positions, not crossings, so a jump between headings still lands.
    let frame = 0
    let afterLock: ReturnType<typeof setTimeout> | undefined
    // Found again only on a resize, so a scroll frame reads positions alone.
    let pane: Element | null | undefined
    let paddingTop = 0
    // Content grows with every example that mounts, so it looks again only while nothing scrolls yet.
    const resized = new ResizeObserver((entries) => {
      if (!pane || entries.some(({ target }) => target !== mainEl)) measure()
      scheduleHighlight()
    })
    const measure = () => {
      const next = scrollParentOf(mainEl)
      if (next !== pane) {
        if (pane !== undefined)
          resized.unobserve(pane ?? document.documentElement)
        resized.observe(next ?? document.documentElement)
        pane = next
      }
      paddingTop =
        parseFloat(
          getComputedStyle(pane ?? document.documentElement).scrollPaddingTop
        ) || 0
    }
    const highlight = () => {
      frame = 0
      const locked = programmaticScrollLockRef.current - Date.now()
      if (locked > 0) {
        clearTimeout(afterLock)
        afterLock = setTimeout(scheduleHighlight, locked)
        return
      }
      const scroller = pane ?? document.documentElement
      const top = pane?.getBoundingClientRect().top ?? 0
      const height = pane?.clientHeight ?? window.innerHeight
      // Short closing sections can't rise to the line, so the end of the page takes them all.
      const atEnd =
        scroller.scrollTop + height >= scroller.scrollHeight - 1 &&
        scroller.scrollTop > 0
      const line =
        top +
        (atEnd ? height : paddingTop + (height - paddingTop) * ACTIVE_LINE)
      let active: string | undefined
      for (const [id, el] of elementsRef.current) {
        if (!el.getClientRects().length) continue
        if (active && el.getBoundingClientRect().top > line) break
        active = id
      }
      if (active) setActiveHeading(active)
    }
    const scheduleHighlight = () => {
      frame ||= requestAnimationFrame(highlight)
    }

    const collect = () => {
      const collected: Heading[] = []
      const elements = new Map<string, HTMLHeadingElement>()

      // Only headings rendered with an id: writing one after render breaks hydration.
      mainEl.querySelectorAll<HTMLHeadingElement>(selector).forEach((el) => {
        const text = el.textContent?.trim() ?? ''
        if (!text) return

        // Skip example headings (Roadie parts carry data-slot) inside the content only.
        const slot = el.closest('[data-slot], [data-live-example]')
        if (slot && mainEl.contains(slot)) return

        if (!el.id || elements.has(el.id)) {
          warnUnlinkable(el, text)
          return
        }
        elements.set(el.id, el)
        collected.push({
          id: el.id,
          text,
          level: el.tagName === 'H2' ? 2 : 3
        })
      })

      elementsRef.current = elements
      setHeadings(collected)
      scheduleHighlight()
    }

    measure()
    resized.observe(mainEl)
    collect()
    // A hash jump lands before the examples around it mount, which would push it away.
    const landOnHash = () => {
      seenHashRef.current = window.location.hash
      let id: string
      try {
        id = decodeURIComponent(window.location.hash.slice(1))
      } catch {
        return
      }
      const target = id ? document.getElementById(id) : null
      if (target && mainEl.contains(target)) landOn(target, false)
    }
    const followHash = () => {
      if (window.location.hash !== seenHashRef.current) landOnHash()
    }
    landOnHash()
    window.addEventListener('hashchange', followHash)
    // Next's router moves the hash with pushState, which fires no hashchange.
    const navigation = 'navigation' in window ? window.navigation : undefined
    navigation?.addEventListener('currententrychange', followHash)
    // A document that scrolls keeps its box when only the viewport's height changes.
    const onWindowResize = () => {
      measure()
      scheduleHighlight()
    }
    window.addEventListener('resize', onWindowResize)
    // Capture hears the pane's scroll as well as the window's.
    document.addEventListener('scroll', scheduleHighlight, {
      capture: true,
      passive: true
    })
    // The page's content can be swapped for new nodes after this effect runs.
    const mutations = new MutationObserver(collect)
    mutations.observe(mainEl, { childList: true, subtree: true })
    // Streaming can replace the wrapper itself, leaving the observers on a detached node.
    const replaced = new MutationObserver(() => {
      if (mainEl.isConnected) return
      const next = document.getElementById('docs-content')
      if (!next) return
      resized.unobserve(mainEl)
      mainEl = next
      mutations.disconnect()
      mutations.observe(mainEl, { childList: true, subtree: true })
      resized.observe(mainEl)
      measure()
      collect()
      landOnHash()
    })
    replaced.observe(document.body, { childList: true, subtree: true })
    return () => {
      window.removeEventListener('hashchange', followHash)
      navigation?.removeEventListener('currententrychange', followHash)
      document.removeEventListener('scroll', scheduleHighlight, {
        capture: true
      })
      window.removeEventListener('resize', onWindowResize)
      resized.disconnect()
      cancelAnimationFrame(frame)
      clearTimeout(afterLock)
      mutations.disconnect()
      replaced.disconnect()
    }
  }, [route, enabled])

  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, id: string) => {
      // Skip modifier-key clicks so users can still open in new tabs etc.
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return

      const target = elementsRef.current.get(id)
      if (!target) return

      event.preventDefault()
      programmaticScrollLockRef.current =
        Date.now() + PROGRAMMATIC_SCROLL_LOCK_MS
      // The pane scrolls, not the window; its scroll-pt keeps the heading clear.
      landOn(target, true)
      setActiveHeading(id)
      // Compared with location.hash, which percent-encodes.
      seenHashRef.current = new URL(`#${id}`, window.location.href).hash
      window.history.replaceState(null, '', `#${id}`)
    },
    []
  )

  return { headings, onSelect: handleClick }
}

export function OnThisPage({ headings, onSelect }: DocHeadings) {
  const activeId = useActiveHeading()
  return (
    <nav aria-label='On this page'>
      <p className='mb-3 text-sm font-semibold text-strong'>On this page</p>
      <ul className='grid gap-2 border-l border-subtler'>
        {headings.map((h) => (
          <li
            key={h.id}
            className={cn('-ml-px border-l border-transparent pl-3', {
              'pl-6': h.level === 3,
              'border-accent-9': activeId === h.id
            })}
          >
            <a
              href={`#${h.id}`}
              aria-current={activeId === h.id ? 'location' : undefined}
              onClick={(event) => onSelect(event, h.id)}
              className={cn(
                'block text-sm transition-colors',
                activeId === h.id
                  ? 'font-semibold text-strong'
                  : 'text-subtle hover:text-normal'
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
