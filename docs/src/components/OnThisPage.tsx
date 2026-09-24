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

const SCROLL_OFFSET_PX = 80
// Smooth scroll usually settles in <500ms but we leave headroom for slow
// machines + the inertia tail before honouring observer updates again.
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/** Headings and a scroll-to handler, lifted so the inspector renders only with two or more. */
export function useDocHeadings(): DocHeadings {
  const route = useRoute()
  const [headings, setHeadings] = useState<Heading[]>([])

  // Tracks programmatic (click-driven) scrolls so the IntersectionObserver
  // doesn't briefly highlight headings that pass through the active band
  // while smooth-scrolling toward the user's target.
  const programmaticScrollLockRef = useRef<number>(0)
  const elementsRef = useRef(new Map<string, HTMLHeadingElement>())

  useEffect(() => {
    // Clear on every bail-out, or the last page's headings linger.
    if (route === '/') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading DOM state on mount
      setHeadings([])
      return
    }
    // Scope to the content wrapper, not the Navigator's <main>.
    const mainEl = document.getElementById('docs-content')
    if (!mainEl) {
      setHeadings([])
      return
    }

    // These pages' h3s duplicate the navigation or run to dozens.
    const selector = ['/components', '/tokens/reference'].includes(route)
      ? 'h2'
      : 'h2, h3'
    const idOf = new Map<Element, string>()
    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < programmaticScrollLockRef.current) return
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              a.target.getBoundingClientRect().top -
              b.target.getBoundingClientRect().top
          )
        const id = visible[0] && idOf.get(visible[0].target)
        if (id) setActiveHeading(id)
      },
      { rootMargin: `-${SCROLL_OFFSET_PX}px 0px -70% 0px`, threshold: 0 }
    )

    const collect = () => {
      // Seed with every id on the page, so an assigned id never collides.
      const usedIds = new Set<string>(
        Array.from(document.querySelectorAll<HTMLElement>('[id]')).map(
          (node) => node.id
        )
      )
      const collected: Heading[] = []
      const elements = new Map<string, HTMLHeadingElement>()
      observer.disconnect()
      idOf.clear()

      mainEl.querySelectorAll<HTMLHeadingElement>(selector).forEach((el) => {
        const text = el.textContent?.trim() ?? ''
        if (!text) return

        // Skip example headings (Roadie parts carry data-slot) inside the content only.
        const slot = el.closest('[data-slot]')
        if (slot && mainEl.contains(slot)) return

        // The page may not have hydrated yet, so the id is only written on click.
        let id = el.id
        if (!id) {
          const base = slugify(text)
          if (!base) return
          id = base
          let suffix = 2
          while (usedIds.has(id)) {
            id = `${base}-${suffix++}`
          }
        }
        usedIds.add(id)
        elements.set(id, el)
        idOf.set(el, id)
        observer.observe(el)
        collected.push({ id, text, level: el.tagName === 'H2' ? 2 : 3 })
      })

      elementsRef.current = elements
      setHeadings(collected)
    }

    collect()
    // The page's content can be swapped for new nodes after this effect runs.
    const mutations = new MutationObserver(collect)
    mutations.observe(mainEl, { childList: true, subtree: true })
    return () => {
      mutations.disconnect()
      observer.disconnect()
    }
  }, [route])

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
      target.id = id

      event.preventDefault()
      programmaticScrollLockRef.current =
        Date.now() + PROGRAMMATIC_SCROLL_LOCK_MS
      // The pane scrolls, not the window; its scroll-pt keeps the heading clear.
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveHeading(id)
      if (window.history.replaceState) {
        window.history.replaceState(null, '', `#${id}`)
      }
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
