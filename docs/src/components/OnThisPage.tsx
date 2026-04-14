'use client'

import {
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'

import { usePathname } from 'next/navigation'

import { cn } from '@oztix/roadie-core/utils'

const SCROLL_OFFSET_PX = 80
// Smooth scroll usually settles in <500ms but we leave headroom for slow
// machines + the inertia tail before honouring observer updates again.
const PROGRAMMATIC_SCROLL_LOCK_MS = 800

type Heading = { id: string; text: string; level: 2 | 3 }

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function OnThisPage() {
  const pathname = usePathname()
  const [headings, setHeadings] = useState<Heading[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  // Tracks programmatic (click-driven) scrolls so the IntersectionObserver
  // doesn't briefly highlight headings that pass through the active band
  // while smooth-scrolling toward the user's target.
  const programmaticScrollLockRef = useRef<number>(0)

  useEffect(() => {
    if (pathname === '/') return
    const mainEl = document.querySelector('main')
    if (!mainEl) return

    const nodes = mainEl.querySelectorAll<HTMLHeadingElement>('h2, h3')
    const usedIds = new Set<string>()
    const collected: Heading[] = []

    nodes.forEach((el) => {
      const text = el.textContent?.trim() ?? ''
      if (!text) return

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

    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading DOM state on mount
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
        if (visible[0]) setActiveId(visible[0].target.id)
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
      const top =
        target.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET_PX
      programmaticScrollLockRef.current =
        Date.now() + PROGRAMMATIC_SCROLL_LOCK_MS
      window.scrollTo({ top, behavior: 'smooth' })
      setActiveId(id)
      if (window.history.replaceState) {
        window.history.replaceState(null, '', `#${id}`)
      }
    },
    []
  )

  if (pathname === '/') return null
  if (headings.length < 2) return null

  return (
    <nav
      aria-label='On this page'
      className='hidden lg:sticky lg:top-20 lg:block lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto'
    >
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
              onClick={(event) => handleClick(event, h.id)}
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
