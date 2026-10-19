'use client'

import {
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { CubeIcon } from '@phosphor-icons/react'

import type { PackageKey, ReleaseView } from '@/lib/releases'

import { EmptyState } from '@oztix/roadie-components/empty-state'
import { ToggleGroup } from '@oztix/roadie-components/toggle-group'

import { useInspector } from '../InspectorSlot'
import { landOn } from '../landOn'
import { scrollParentOf } from '../nearViewport'
import { ReleaseSummary } from './ReleaseParts'
import { type RailMonth, ReleaseRail, setActiveMonth } from './ReleaseRail'
import { type Shown, filterRelease } from './filterRelease'

export type PackageOption = { key: PackageKey; label: string }

const ALL = 'all'
// Rendered on the server, so the page paints its newest releases before hydrating.
const FIRST_RENDERED = 3
// A release takes over the rail once its top rises into the top 30% of the pane.
const ACTIVE_LINE = 0.3

// Space a release takes before it renders, from what it holds. A release
// keeps its measured height once it has rendered.
const estimate = ({ cards, items }: ReleaseView) =>
  220 +
  Math.ceil(cards.length / 2) * 104 +
  Math.min(items.length, 8) * 28 +
  (items.length > 8 ? 40 : 0)

const MONTH = new Intl.DateTimeFormat('en-AU', {
  month: 'long',
  timeZone: 'UTC'
})

const monthName = (date: string) => MONTH.format(new Date(`${date}T00:00:00Z`))

function railMonths(shown: Shown[]): RailMonth[] {
  const months = new Map<string, RailMonth>()
  for (const { release } of shown) {
    if (!release.date) continue
    const key = release.date.slice(0, 7)
    if (!months.has(key))
      months.set(key, {
        key,
        year: release.date.slice(0, 4),
        month: monthName(release.date),
        slug: release.slug
      })
  }
  return [...months.values()]
}

/** Reports `?package=` from the URL; its own boundary, since search params suspend a static page. */
function PackageParam({
  onChange
}: {
  onChange: (key: string | null) => void
}) {
  const value = useSearchParams().get('package')
  useEffect(() => onChange(value), [value, onChange])
  return null
}

function PackageFilter({
  options,
  value,
  onChange
}: {
  options: PackageOption[]
  value: PackageKey | null
  onChange: (key: PackageKey | null) => void
}) {
  return (
    <ToggleGroup
      aria-label='Package'
      size='sm'
      emphasis='subtle'
      value={[value ?? ALL]}
      onValueChange={([next]) =>
        onChange(next && next !== ALL ? (next as PackageKey) : null)
      }
      className='max-w-full justify-self-start'
    >
      <ToggleGroup.Item value={ALL}>All</ToggleGroup.Item>
      {options.map(({ key, label }) => (
        <ToggleGroup.Item key={key} value={key}>
          {label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup>
  )
}

type Slots = {
  rendered: ReadonlySet<string>
  /** Measured heights by filter and slug, since a filter changes a release's height. */
  heights: ReadonlyMap<string, number>
}

/**
 * Every release, newest first, with only those near the screen in the DOM.
 * The rest hold their place at their measured or estimated height, so the
 * rail and links can jump to any of them.
 */
export function ChangelogTimeline({
  releases,
  art,
  packages
}: {
  releases: ReleaseView[]
  art: Record<string, ReactNode>
  packages: PackageOption[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [filter, setFilter] = useState<PackageKey | null>(null)
  const reportParam = useCallback(
    (value: string | null) =>
      setFilter(
        packages.some(({ key }) => key === value) ? (value as PackageKey) : null
      ),
    [packages]
  )
  const changeFilter = (key: PackageKey | null) => {
    setFilter(key)
    router.replace(key ? `${pathname}?package=${key}` : pathname, {
      scroll: false
    })
  }

  const shown = useMemo(
    () =>
      releases.flatMap((release) => {
        const view = filterRelease(release, filter)
        return view ? [view] : []
      }),
    [releases, filter]
  )

  const listRef = useRef<HTMLDivElement>(null)
  const heightKey = useCallback(
    (slug: string) => `${filter ?? ALL}/${slug}`,
    [filter]
  )
  const [slots, setSlots] = useState<Slots>(() => ({
    rendered: new Set(
      releases.slice(0, FIRST_RENDERED).map((release) => release.slug)
    ),
    heights: new Map()
  }))

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const sections = [...list.querySelectorAll<HTMLElement>('[data-release]')]
    const root = scrollParentOf(list)
    const near = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        const leaving = new Map<string, number>()
        for (const { target, isIntersecting } of entries) {
          const slug = (target as HTMLElement).dataset.release!
          if (isIntersecting) near.add(slug)
          else {
            near.delete(slug)
            if (target.childElementCount > 0)
              leaving.set(
                heightKey(slug),
                target.getBoundingClientRect().height
              )
          }
        }
        setSlots((previous) => ({
          rendered: new Set(near),
          heights: new Map([...previous.heights, ...leaving])
        }))
      },
      // A screen ahead each way, so a release is ready before it scrolls in.
      { root, rootMargin: '100% 0px' }
    )
    for (const section of sections) observer.observe(section)

    let frame = 0
    const track = () => {
      frame = 0
      const top = root?.getBoundingClientRect().top ?? 0
      const height = root?.clientHeight ?? window.innerHeight
      const line = top + height * ACTIVE_LINE
      // Above the first release, the rail marks it, not nothing.
      let active: HTMLElement | undefined = sections[0]
      for (const section of sections) {
        if (section.getBoundingClientRect().top > line) break
        active = section
      }
      const date = active?.dataset.date
      setActiveMonth(
        active?.dataset.release === 'unreleased'
          ? 'unreleased'
          : date
            ? date.slice(0, 7)
            : null
      )
    }
    const scheduleTrack = () => {
      frame ||= requestAnimationFrame(track)
    }
    track()
    document.addEventListener('scroll', scheduleTrack, {
      capture: true,
      passive: true
    })
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      document.removeEventListener('scroll', scheduleTrack, { capture: true })
      setActiveMonth(null)
    }
  }, [shown, heightKey])

  const jumpTo = useCallback((slug: string) => {
    const target = document.getElementById(slug)
    if (!target) return
    landOn(target, false)
    window.history.replaceState(window.history.state, '', `#${slug}`)
  }, [])

  // The frame's hash landing is off while the rail fills the inspector, so a
  // link to a release or a heading on the page lands here.
  useEffect(() => {
    let id = ''
    try {
      id = decodeURIComponent(window.location.hash.slice(1))
    } catch {
      return
    }
    const target = id ? document.getElementById(id) : null
    if (target && document.getElementById('docs-content')?.contains(target))
      landOn(target, false)
  }, [])

  const months = useMemo(() => railMonths(shown), [shown])
  const pending = shown[0]?.release.pending ?? false
  const closeInspector = useRef<(() => void) | undefined>(undefined)
  const rail = useMemo(
    () => (
      <ReleaseRail
        months={months}
        pending={pending}
        onSelect={(slug) => {
          closeInspector.current?.()
          jumpTo(slug)
        }}
      />
    ),
    [months, pending, jumpTo]
  )
  const close = useInspector(rail)
  useEffect(() => {
    closeInspector.current = close
  }, [close])

  const label = packages.find(({ key }) => key === filter)?.label

  return (
    <div data-not-prose className='@container grid gap-6'>
      <Suspense fallback={null}>
        <PackageParam onChange={reportParam} />
      </Suspense>
      <PackageFilter
        options={packages}
        value={filter}
        onChange={changeFilter}
      />
      {shown.length === 0 ? (
        <EmptyState size='sm'>
          <EmptyState.IconTile>
            <CubeIcon weight='bold' />
          </EmptyState.IconTile>
          <EmptyState.Title>No {label} releases yet</EmptyState.Title>
          <EmptyState.Description>
            Its first release will show here.
          </EmptyState.Description>
        </EmptyState>
      ) : null}
      <div ref={listRef} className='grid divide-y divide-subtle'>
        {shown.map(({ release, headline }) => {
          const rendered = slots.rendered.has(release.slug)
          return (
            <section
              key={release.slug}
              id={release.slug}
              data-release={release.slug}
              data-date={release.date ?? undefined}
              aria-labelledby={rendered ? `${release.slug}-title` : undefined}
              className='scroll-mt-6 py-10 first:pt-4'
              style={
                rendered
                  ? undefined
                  : {
                      height:
                        slots.heights.get(heightKey(release.slug)) ??
                        estimate(release)
                    }
              }
            >
              {rendered ? (
                <ReleaseSummary
                  release={release}
                  headline={headline}
                  art={art}
                />
              ) : null}
            </section>
          )
        })}
      </div>
    </div>
  )
}
