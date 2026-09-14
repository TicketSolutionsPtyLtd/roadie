'use client'

import {
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore
} from 'react'

import { usePathname } from 'next/navigation'

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

// Outside React state, so a highlight change re-renders only the lists that
// show it, not the navigation that declares them.
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

/**
 * Lifted out of the view so the inspector pane can be declared only when there
 * is a table of contents — a declared inspector puts a reveal toggle in the top
 * pane's header, and below 2xl that toggle would otherwise open an empty
 * drawer.
 */
export function useDocHeadings(): DocHeadings {
  const pathname = usePathname()
  const [headings, setHeadings] = useState<Heading[]>([])

  // Tracks programmatic (click-driven) scrolls so the IntersectionObserver
  // doesn't briefly highlight headings that pass through the active band
  // while smooth-scrolling toward the user's target.
  const programmaticScrollLockRef = useRef<number>(0)

  useEffect(() => {
    // Every bail-out clears first. The count is what declares the inspector
    // pane, so a route with no contents that returned early would leave the
    // previous page's headings standing — links to ids that no longer exist.
    if (pathname === '/') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading DOM state on mount
      setHeadings([])
      return
    }
    // Navigator wraps the page in a scrolling pane, so scope to the content
    // wrapper rather than <main> (which is now Navigator.Content and carries a
    // data-slot the skip below would otherwise trip on).
    const mainEl = document.getElementById('docs-content')
    if (!mainEl) {
      setHeadings([])
      return
    }

    // The /components index's h3s duplicate the left-hand navigation.
    const selector = pathname === '/components' ? 'h2' : 'h2, h3'
    const nodes = mainEl.querySelectorAll<HTMLHeadingElement>(selector)

    // Seed with every existing id already on the page — not just the ids
    // we assign this pass. This used to guard against a specific collision:
    // the MDX page title rendered an h1 (e.g. "Select") that rehype-slug
    // tagged with id="select", and a later same-text h3 — typically the
    // root entry in `<PropsDefinitions>`'s API reference section — could
    // steal it at runtime if this seed didn't already know "select" was
    // taken. The title now renders via React as `Pane.BodyTitle`, not MDX,
    // so it never receives a rehype-slug id — and the `h2, h3` selector
    // above skips it regardless of where it lives — so that specific
    // collision can't recur. The seed stays anyway: it is the only thing
    // that protects a same-text h3 from colliding with any other id already
    // on the page, from any source.
    const usedIds = new Set<string>(
      Array.from(document.querySelectorAll<HTMLElement>('[id]')).map(
        (node) => node.id
      )
    )
    const collected: Heading[] = []

    nodes.forEach((el) => {
      const text = el.textContent?.trim() ?? ''
      if (!text) return

      // Skip headings rendered inside component examples (Roadie leaves carry
      // data-slot); real section headings never do. Bound the check to the
      // content wrapper — the enclosing `Pane` carries a data-slot too, and
      // every heading is inside it.
      const slot = el.closest('[data-slot]')
      if (slot && mainEl.contains(slot)) return

      let id = el.id
      if (!id) {
        const base = slugify(text)
        if (!base) return
        id = base
        let suffix = 2
        while (usedIds.has(id)) {
          id = `${base}-${suffix++}`
        }
        el.id = id
      }
      usedIds.add(id)

      collected.push({
        id,
        text,
        level: el.tagName === 'H2' ? 2 : 3
      })
    })

    setHeadings(collected)

    if (collected.length === 0) return

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
        if (visible[0]) setActiveHeading(visible[0].target.id)
      },
      { rootMargin: `-${SCROLL_OFFSET_PX}px 0px -70% 0px`, threshold: 0 }
    )

    nodes.forEach((node) => {
      if (node.id) observer.observe(node)
    })
    return () => observer.disconnect()
  }, [pathname])

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

      const target = document.getElementById(id)
      if (!target) return

      event.preventDefault()
      programmaticScrollLockRef.current =
        Date.now() + PROGRAMMATIC_SCROLL_LOCK_MS
      // The page no longer scrolls — the content Pane does. scrollIntoView
      // walks up to that scroll container; the pane's scroll-pt keeps the
      // heading clear of the top edge.
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

/**
 * The table of contents itself. Visibility and stickiness belong to the
 * enclosing inspector pane, so this carries neither.
 */
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
