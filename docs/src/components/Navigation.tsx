'use client'

import {
  type MouseEvent,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore
} from 'react'

import { usePathname, useRouter } from 'next/navigation'

import {
  CompassIcon,
  CubeIcon,
  HouseIcon,
  ListIcon,
  PaintBrushIcon,
  PaletteIcon,
  SquaresFourIcon
} from '@phosphor-icons/react'

import type { CatalogueCategory } from '@/lib/page-manifest'
import { relatedLinks } from '@/lib/token-families'

import { Drawer, IconButton, Navigator, Pane } from '@oztix/roadie-components'
import { serializeNavigatorExpandedCookie } from '@oztix/roadie-core/navigator'

import { FooterNav } from './FooterNav'
import { Image } from './Image'
import {
  NAV_LIST_PARAM,
  NAV_MORE_PARAM,
  NavQueryFlags,
  useNavQuery
} from './NavQueryFlag'
import { type DocHeadings, OnThisPage, useDocHeadings } from './OnThisPage'
import { RelatedLinks } from './RelatedLinks'

export type NavigationItem = {
  title: string
  href?: string
  description?: string
}

export type NavigationSection = {
  title: string
  href: string
  /** Flat, in reading order; `FooterNav` walks these. */
  items: NavigationItem[]
  /** When set, the secondary list renders these groups instead of `items`. */
  groups?: CatalogueCategory[]
  root?: 'page'
  searchable?: boolean
}

type NavigationProps = {
  items: NavigationSection[]
  /** Route → page title, rendered as `Pane.BodyTitle`. */
  pageTitles: Record<string, string>
  children: ReactNode
}

const SECTION_ICONS: Record<string, ReactNode> = {
  '/': <HouseIcon />,
  '/foundations': <CompassIcon />,
  '/tokens': <PaletteIcon />,
  '/components': <CubeIcon />,
  '/roadie-widgets': <SquaresFourIcon />
}

const persistExpanded = (next: boolean) => {
  document.cookie = serializeNavigatorExpandedCookie(next)
}

// The nav-form breakpoint, and the natural phone/tablet split for the sheet.
const TABLET_UP = '(min-width: 48rem)'

let tabletUpQuery: MediaQueryList | null = null
const getTabletUpQuery = () => (tabletUpQuery ??= window.matchMedia(TABLET_UP))

const subscribeTabletUp = (onChange: () => void) => {
  const query = getTabletUpQuery()
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/** Drawer side is a JS value, so the app picks its band here; Roadie knows no bands. */
function useDrawerSide(): 'bottom' | 'right' {
  const tabletUp = useSyncExternalStore(
    subscribeTabletUp,
    () => getTabletUpQuery().matches,
    () => false
  )
  return tabletUp ? 'right' : 'bottom'
}

function OnThisPageDrawer({ headings, onSelect }: DocHeadings) {
  const [open, setOpen] = useState(false)
  const side = useDrawerSide()

  const selectAndClose = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, id: string) => {
      onSelect(event, id)
      setOpen(false)
    },
    [onSelect]
  )

  return (
    <Drawer open={open} onOpenChange={setOpen} side={side}>
      <Drawer.Trigger
        render={
          <IconButton
            aria-label='On this page'
            emphasis='normal'
            className='pane-inspector-yielded:inline-flex hidden'
          >
            <ListIcon weight='bold' className='size-5' />
          </IconButton>
        }
      />
      {/* Named on the popup rather than with a `Drawer.Title`: `OnThisPage`
          already prints its own heading, and two would say it twice. */}
      <Drawer.Content aria-label='On this page'>
        <Drawer.Body className='py-4'>
          <OnThisPage headings={headings} onSelect={selectAndClose} />
        </Drawer.Body>
      </Drawer.Content>
    </Drawer>
  )
}

export function DocsNavigator({
  items,
  pageTitles,
  children
}: NavigationProps) {
  const pathname = usePathname()
  const router = useRouter()

  const [query, reportQuery] = useNavQuery(pathname)

  // Params we pushed this session, so closing can pop that entry instead of
  // adding a new one. A deep-linked/reloaded flag isn't in here, so closing
  // it replaces instead — no dead history entry, no Back into the page.
  const pushedFlags = useRef(new Set<string>())
  useEffect(() => {
    pushedFlags.current.clear()
  }, [pathname])

  const pushFlag = useCallback(
    (param: string, on: boolean) => {
      if (on) {
        pushedFlags.current.add(param)
        router.push(`${pathname}?${param}`, { scroll: false })
        return
      }
      if (pushedFlags.current.delete(param)) {
        router.back()
      } else {
        router.replace(pathname, { scroll: false })
      }
    },
    [router, pathname]
  )
  const handleShowListChange = useCallback(
    (next: boolean) => pushFlag(NAV_LIST_PARAM, next),
    [pushFlag]
  )
  const handleShowMoreChange = useCallback(
    (next: boolean) => pushFlag(NAV_MORE_PARAM, next),
    [pushFlag]
  )

  const related = relatedLinks(pathname)
  const toc = useDocHeadings()
  const showInspector = toc.headings.length >= 2

  return (
    <>
      <Suspense fallback={null}>
        <NavQueryFlags onChange={reportQuery} />
      </Suspense>
      <Navigator
        value={pathname}
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
          {items.map((section) => {
            const subItems = section.items.filter(
              (item) => item.href !== section.href
            )
            return (
              <Navigator.Item
                key={section.href}
                value={section.href}
                href={section.href}
                icon={SECTION_ICONS[section.href] ?? <HouseIcon />}
                visibilityPriority={
                  section.href === '/tokens' ? 'low' : undefined
                }
              >
                {section.title}
                {section.groups ? (
                  <Navigator.Secondary
                    aria-label={section.title}
                    root={section.root}
                    searchable={section.searchable}
                  >
                    {section.groups.map((group) => (
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
                            value={entry.href}
                            href={entry.href}
                            description={entry.description}
                          >
                            {entry.title}
                          </Navigator.Item>
                        ))}
                      </Navigator.Group>
                    ))}
                  </Navigator.Secondary>
                ) : subItems.length > 0 ? (
                  <Navigator.Secondary
                    aria-label={`${section.title} pages`}
                    root={section.root}
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

        <Navigator.Content>
          <Pane role='detail' current className='scroll-pt-6'>
            <Pane.Header>
              {showInspector ? (
                <Pane.Actions>
                  <OnThisPageDrawer {...toc} />
                </Pane.Actions>
              ) : null}
            </Pane.Header>
            <div
              id='docs-content'
              className='mx-auto grid w-full max-w-[50rem] gap-0 py-6 md:py-12 [&_:is(h1,h2,h3,h4)]:scroll-mt-6'
            >
              {/* The homepage and debug routes have no metadata.title and keep their own h1. */}
              {pageTitles[pathname] ? (
                <Pane.BodyTitle className='mb-6 text-display-prose-1'>
                  {pageTitles[pathname]}
                </Pane.BodyTitle>
              ) : null}
              {related ? (
                <RelatedLinks {...related} className='-mt-3 mb-6' />
              ) : null}
              {children}
              <FooterNav items={items} />
            </div>
          </Pane>

          {/* A column once it fits; otherwise the drawer in Pane.Actions. */}
          {showInspector ? (
            <Pane role='inspector' aria-label='On this page'>
              <div className='py-6'>
                <OnThisPage {...toc} />
              </div>
            </Pane>
          ) : null}
        </Navigator.Content>
      </Navigator>
    </>
  )
}
