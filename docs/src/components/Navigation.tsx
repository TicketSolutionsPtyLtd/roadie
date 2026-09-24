'use client'

import {
  type MouseEvent,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'

import { useRouter } from 'next/navigation'

import {
  ChartLineIcon,
  CompassIcon,
  CubeIcon,
  HouseIcon,
  ListDashesIcon,
  PaintBrushIcon,
  PaletteIcon,
  SquaresFourIcon
} from '@phosphor-icons/react'

import type { CatalogueCategory, CatalogueEntry } from '@/lib/page-manifest'
import { useRoute } from '@/lib/route'
import { relatedLinks } from '@/lib/token-families'

import { Navigator, Pane } from '@oztix/roadie-components'
import { serializeNavigatorExpandedCookie } from '@oztix/roadie-core/navigator'

import { FooterNav } from './FooterNav'
import { Image } from './Image'
import {
  NAV_LIST_PARAM,
  NAV_MORE_PARAM,
  NavQueryFlags,
  useNavQuery
} from './NavQueryFlag'
import { OnThisPage, useDocHeadings } from './OnThisPage'
import { RelatedLinks } from './RelatedLinks'

export type NavigationItem = {
  title: string
  href?: string
  description?: string
}

export type NavigationDestination = {
  title: string
  href: string
  /** Flat, in reading order; `FooterNav` walks these. */
  items: NavigationItem[]
  /** When set, the secondary list renders these groups instead of `items`. */
  groups?: CatalogueCategory[]
  overview?: boolean
  searchable?: boolean
}

type NavigationProps = {
  items: NavigationDestination[]
  /** Route → page title, rendered as `Pane.BodyTitle`. */
  pageTitles: Record<string, string>
  /** Routes whose content column drops the standard reading-width cap. */
  pageWide: Record<string, boolean>
  children: ReactNode
}

const DESTINATION_ICONS: Record<string, ReactNode> = {
  '/': <HouseIcon />,
  '/foundations': <CompassIcon />,
  '/tokens': <PaletteIcon />,
  '/components': <CubeIcon />,
  '/charts': <ChartLineIcon />,
  '/roadie-widgets': <SquaresFourIcon />
}

// A cross listing never matches the route, so the page's own destination stays the lit one.
const entryValue = (host: string, entry: CatalogueEntry) =>
  entry.crossListedFrom ? `${host}#${entry.href}` : entry.href

const persistExpanded = (next: boolean) => {
  document.cookie = serializeNavigatorExpandedCookie(next)
}

// From the live query, so the page's own params, like the token filters, survive.
function hrefWithFlag(pathname: string, param: string, on: boolean) {
  const params = new URLSearchParams(window.location.search)
  params.delete(param)
  const search = [params.toString(), on ? param : ''].filter(Boolean).join('&')
  return search ? `${pathname}?${search}` : pathname
}

export function DocsNavigator({
  items,
  pageTitles,
  pageWide,
  children
}: NavigationProps) {
  const route = useRoute()
  const router = useRouter()

  const [query, reportQuery] = useNavQuery(route)

  // Flags pushed this session, so closing pops them; a deep-linked flag is replaced instead.
  const pushedFlags = useRef(new Set<string>())
  useEffect(() => {
    pushedFlags.current.clear()
  }, [route])

  const pushFlag = useCallback(
    (param: string, on: boolean) => {
      if (on) {
        pushedFlags.current.add(param)
        router.push(hrefWithFlag(route, param, true), { scroll: false })
        return
      }
      if (pushedFlags.current.delete(param)) {
        router.back()
      } else {
        router.replace(hrefWithFlag(route, param, false), { scroll: false })
      }
    },
    [router, route]
  )
  const handleShowListChange = useCallback(
    (next: boolean) => pushFlag(NAV_LIST_PARAM, next),
    [pushFlag]
  )
  const handleShowMoreChange = useCallback(
    (next: boolean) => pushFlag(NAV_MORE_PARAM, next),
    [pushFlag]
  )

  const related = relatedLinks(route)
  const isWide = pageWide[route] ?? false
  const toc = useDocHeadings()
  const showInspector = toc.headings.length >= 2 && !isWide
  // Held here so picking a heading can close the drawer the column yields into.
  const [tocRevealed, setTocRevealed] = useState(false)
  const { onSelect: scrollToHeading } = toc
  const selectHeading = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, id: string) => {
      scrollToHeading(event, id)
      setTocRevealed(false)
    },
    [scrollToHeading]
  )

  // The bare canary owns the whole window; see docs/src/app/debug/bare.
  if (route.startsWith('/debug/bare')) return children

  return (
    <>
      <Suspense fallback={null}>
        <NavQueryFlags onChange={reportQuery} />
      </Suspense>
      <Navigator
        value={route}
        onExpandedChange={persistExpanded}
        expandedFromDocument
        showList={query.nav}
        onShowListChange={handleShowListChange}
        showMore={query.more}
        onShowMoreChange={handleShowMoreChange}
      >
        <Navigator.Primary aria-label='Documentation'>
          <Navigator.Brand>
            <Image
              src='/roadie-brand.png'
              alt='Roadie'
              width={32}
              height={32}
              className='size-8 shrink-0'
            />
            <span
              aria-hidden
              className='hidden truncate text-base font-semibold text-strong navigator-expanded:inline'
            >
              Roadie
            </span>
          </Navigator.Brand>
          {items.map((destination) => {
            const subItems = destination.items.filter(
              (item) => item.href !== destination.href
            )
            return (
              <Navigator.Item
                key={destination.href}
                value={destination.href}
                href={destination.href}
                icon={DESTINATION_ICONS[destination.href] ?? <HouseIcon />}
                visibilityPriority={
                  destination.href === '/tokens' ? 'low' : undefined
                }
              >
                {destination.title}
                {destination.groups && !isWide ? (
                  <Navigator.Secondary
                    aria-label={destination.title}
                    overview={destination.overview}
                    searchable={destination.searchable}
                  >
                    {destination.groups.map((group) => (
                      <Navigator.Group key={group.name}>
                        <Navigator.GroupTitle>
                          {group.name}
                        </Navigator.GroupTitle>
                        {group.overviewHref ? (
                          <Navigator.Item
                            value={group.overviewHref}
                            href={group.overviewHref}
                          >
                            {`${group.name} overview`}
                          </Navigator.Item>
                        ) : null}
                        {group.entries.map((entry) => (
                          <Navigator.Item
                            key={entry.name}
                            value={entryValue(destination.href, entry)}
                            href={entry.href}
                            description={entry.description}
                          >
                            {entry.title}
                          </Navigator.Item>
                        ))}
                      </Navigator.Group>
                    ))}
                  </Navigator.Secondary>
                ) : subItems.length > 0 && !isWide ? (
                  <Navigator.Secondary
                    aria-label={`${destination.title} pages`}
                    overview={destination.overview}
                  >
                    {subItems.map((item) => (
                      <Navigator.Item
                        key={item.href ?? item.title}
                        value={item.href ?? item.title}
                        href={item.href}
                        description={item.description}
                      >
                        {item.title}
                      </Navigator.Item>
                    ))}
                  </Navigator.Secondary>
                ) : null}
              </Navigator.Item>
            )
          })}
          <Navigator.Item
            value='/appearance'
            href='/appearance'
            icon={<PaintBrushIcon />}
            placement='pinned'
          >
            Appearance
          </Navigator.Item>
          <Navigator.ExpandToggle />
        </Navigator.Primary>

        <Pane className='scroll-pt-6'>
          <Pane.Header>
            {showInspector ? (
              <Pane.Actions>
                <Pane.InspectorTrigger aria-label='On this page'>
                  <ListDashesIcon weight='bold' className='size-5' />
                </Pane.InspectorTrigger>
              </Pane.Actions>
            ) : null}
          </Pane.Header>
          <div
            id='docs-content'
            className={`mx-auto grid w-full gap-0 py-6 md:py-12 [&_:is(h1,h2,h3,h4)]:scroll-mt-6 ${isWide ? '' : 'max-w-[50rem]'}`}
          >
            {/* The homepage and debug routes have no metadata.title and keep their own h1. */}
            {pageTitles[route] ? (
              <Pane.BodyTitle className='mb-6 text-display-prose-1'>
                {pageTitles[route]}
              </Pane.BodyTitle>
            ) : null}
            {related ? (
              <RelatedLinks {...related} className='-mt-3 mb-6' />
            ) : null}
            {children}
            <FooterNav items={items} />
          </div>
        </Pane>

        {/* A column once it fits; otherwise Roadie moves it into a drawer. */}
        {showInspector ? (
          <Pane
            column='inspector'
            aria-label='On this page'
            reveal={tocRevealed}
            onRevealChange={setTocRevealed}
          >
            <div className='py-6'>
              <OnThisPage {...toc} onSelect={selectHeading} />
            </div>
          </Pane>
        ) : null}
      </Navigator>
    </>
  )
}
