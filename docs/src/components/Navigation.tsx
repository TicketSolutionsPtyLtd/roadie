'use client'

import {
  type MouseEvent,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore
} from 'react'

import { usePathname, useRouter } from 'next/navigation'

import {
  CheckIcon,
  CompassIcon,
  CubeIcon,
  HouseIcon,
  ListIcon,
  MoonIcon,
  PaintBrushIcon,
  PaletteIcon,
  SquaresFourIcon,
  SunIcon
} from '@phosphor-icons/react'

import type { ComponentCategory } from '@/lib/component-manifest'

import {
  Button,
  DEFAULT_ACCENT_COLOR,
  Drawer,
  IconButton,
  Navigator,
  Pane,
  useTheme
} from '@oztix/roadie-components'

import { FooterNav } from './FooterNav'
import { Image } from './Image'
import { NAV_LIST_PARAM, NavListQuery } from './NavListQuery'
import { type DocHeadings, OnThisPage, useDocHeadings } from './OnThisPage'
import { useExpandedCookie } from './useExpandedCookie'

const ACCENT_PRESETS = [
  { label: 'Blue (default)', hex: DEFAULT_ACCENT_COLOR },
  { label: 'Purple', hex: '#7C3AED' },
  { label: 'Green', hex: '#72BF44' },
  { label: 'Orange', hex: '#EA580C' },
  { label: 'Pink', hex: '#E83068' }
]

const APPEARANCE_VALUE = 'appearance'

interface NavigationItem {
  title: string
  href?: string
  label?: boolean
  description?: string
}

interface NavigationSection {
  title: string
  href: string
  items: NavigationItem[]
}

interface NavigationProps {
  items: NavigationSection[]
  componentCategories: ComponentCategory[]
  /** Route → page title, from `getPageTitles`. `Pane.BodyTitle` renders it as
   * the page's `<h1>`; the header echoes it once collapsed. */
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

function ThemeToggle() {
  const { isDark, setDark } = useTheme()

  return (
    <Button
      size='sm'
      onClick={() => setDark(!isDark)}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <SunIcon weight='bold' className='size-4' />
      ) : (
        <MoonIcon weight='bold' className='size-4' />
      )}
      <span>{isDark ? 'Light' : 'Dark'} mode</span>
    </Button>
  )
}

function AccentPicker() {
  const { accentColor, setAccentColor } = useTheme()

  return (
    <div className='grid gap-2'>
      <p className='text-sm font-semibold text-strong'>Accent color</p>
      <div className='flex flex-wrap gap-2'>
        {ACCENT_PRESETS.map((preset) => {
          const isActive =
            accentColor.toLowerCase() === preset.hex.toLowerCase()
          return (
            <button
              key={preset.hex}
              onClick={() => setAccentColor(preset.hex)}
              className='grid size-9 place-items-center rounded-full ring-0 ring-neutral-5 transition-transform hover:scale-110 hover:shadow-lg hover:ring-2'
              style={{ backgroundColor: preset.hex }}
              aria-label={preset.label}
            >
              {isActive && (
                <CheckIcon weight='bold' className='size-4 text-neutral-0' />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function AppearancePane() {
  return (
    <div className='mx-auto grid w-full max-w-[35rem] gap-6 py-6 md:py-12'>
      <div className='grid gap-1'>
        <h1 className='text-display-ui-3 text-strong'>Appearance</h1>
        <p className='text-subtle'>
          Theme and accent colour for the documentation site.
        </p>
      </div>
      <div className='grid gap-2'>
        <p className='text-sm font-semibold text-strong'>Theme</p>
        <div>
          <ThemeToggle />
        </div>
      </div>
      <AccentPicker />
    </div>
  )
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

/**
 * Bottom sheet on a phone, side drawer from a tablet up.
 *
 * A drawer's edge is CSS but its dismiss gesture is a JavaScript value, so the
 * two can only agree if one discrete side is chosen in JS. The breakpoint lives
 * here, in the application: an app is allowed to know its own bands, and Roadie
 * is not.
 */
function useDrawerSide(): 'bottom' | 'right' {
  const tabletUp = useSyncExternalStore(
    subscribeTabletUp,
    () => getTabletUpQuery().matches,
    () => false
  )
  return tabletUp ? 'right' : 'bottom'
}

/**
 * The small-screen affordance for the inspector pane, which yields its column
 * below `2xl`. Declared by the consumer in `Pane.Actions` — Roadie stopped
 * inventing the overlay, so Base UI owns the scrim, the focus trap, Escape and
 * the swipe.
 */
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
            // From 2xl the inspector is a column of its own — nothing to reveal.
            className='2xl:hidden'
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
  componentCategories,
  pageTitles,
  children
}: NavigationProps) {
  const pathname = usePathname()
  const router = useRouter()

  // `override` only ever holds APPEARANCE_VALUE (no route) and clears on nav.
  const [override, setOverride] = useState<string | null>(null)
  const value = override ?? pathname

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clear the appearance pane when the route changes (incl. back/forward)
    setOverride(null)
  }, [pathname])

  const handleValueChange = useCallback((next: string) => {
    setOverride(next === APPEARANCE_VALUE ? APPEARANCE_VALUE : null)
  }, [])

  const [expanded, setExpanded] = useExpandedCookie()
  const [listState, setListState] = useState({ pathname: '', show: false })
  const showList = listState.show && listState.pathname === pathname
  const handleNavListChange = useCallback(
    (show: boolean, atPathname: string) =>
      setListState((current) =>
        current.pathname === atPathname && current.show === show
          ? current
          : { pathname: atPathname, show }
      ),
    []
  )
  const handleShowListChange = useCallback(
    (next: boolean) => {
      router.push(next ? `${pathname}?${NAV_LIST_PARAM}` : pathname, {
        scroll: false
      })
    },
    [router, pathname]
  )

  const showAppearance = value === APPEARANCE_VALUE
  const toc = useDocHeadings()
  const showInspector = toc.headings.length >= 2 && !showAppearance

  return (
    <>
      <Suspense fallback={null}>
        <NavListQuery onChange={handleNavListChange} />
      </Suspense>
      <Navigator
        value={value}
        onValueChange={handleValueChange}
        expanded={expanded}
        onExpandedChange={setExpanded}
        expandedFromDocument
        showList={showList}
        onShowListChange={handleShowListChange}
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
                {section.href === '/components' ? (
                  <Navigator.Secondary aria-label='Components' searchable>
                    {componentCategories.map((category) => (
                      <Navigator.Group key={category.name}>
                        <Navigator.GroupTitle>
                          {category.name}
                        </Navigator.GroupTitle>
                        {category.overviewHref ? (
                          <Navigator.Item
                            value={category.overviewHref}
                            href={category.overviewHref}
                          >
                            {`${category.name} overview`}
                          </Navigator.Item>
                        ) : null}
                        {category.components.map((component) => (
                          <Navigator.Item
                            key={component.name}
                            value={`/components/${component.name}`}
                            href={`/components/${component.name}`}
                          >
                            {component.title}
                          </Navigator.Item>
                        ))}
                      </Navigator.Group>
                    ))}
                  </Navigator.Secondary>
                ) : subItems.length > 0 ? (
                  <Navigator.Secondary
                    aria-label={`${section.title} pages`}
                    root={section.href === '/' ? 'page' : undefined}
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
            value={APPEARANCE_VALUE}
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
            {showAppearance ? (
              <AppearancePane />
            ) : (
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
                {children}
                <FooterNav items={items} />
              </div>
            )}
          </Pane>

          {/* A column from 2xl up; below it the drawer in the detail pane's actions reaches it. */}
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
