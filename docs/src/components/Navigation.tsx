'use client'

import {
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore
} from 'react'

import { usePathname } from 'next/navigation'

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
  List,
  Navigator,
  Pane,
  useTheme
} from '@oztix/roadie-components'

import { ComponentThumbnail } from './ComponentSkeleton'
import { FooterNav } from './FooterNav'
import { Image } from './Image'
import { type DocHeadings, OnThisPage, useDocHeadings } from './OnThisPage'

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
}

interface NavigationSection {
  title: string
  href?: string
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

// Icon per top-level section, keyed by the section root href the filesystem
// walker emits so the mapping stays in sync with getNavigationItems. Values
// are hrefs — Navigator matches value-equality over the declared tree, and a
// section is branch-active when the current href is one of its sub-pages.
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
    <div className='mx-auto grid w-full max-w-[40rem] gap-6 px-6 py-6 md:px-10 md:py-12'>
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
function OnThisPageDrawer({ headings, activeId, onSelect }: DocHeadings) {
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
          <OnThisPage
            headings={headings}
            activeId={activeId}
            onSelect={selectAndClose}
          />
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
  // Navigator is controlled by a single `value`; the router owns it. The
  // current pathname is the exact-current destination — its item highlights
  // and its ancestor section goes branch-active. Sub-page items are authored
  // directly under Navigator.Secondary (no wrapper component) so the walk
  // that collects descendant values can see them.
  const routeValue = pathname
  const inComponentPage = pathname.startsWith('/components/')

  // The appearance destination has no route — it toggles a pane. Everything
  // else is router-owned, so `override` only ever holds APPEARANCE_VALUE and
  // clears on any real navigation.
  const [override, setOverride] = useState<string | null>(null)
  const value = override ?? pathname

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clear the appearance pane when the route changes (incl. back/forward)
    setOverride(null)
  }, [routeValue])

  const handleValueChange = useCallback((next: string) => {
    setOverride(next === APPEARANCE_VALUE ? APPEARANCE_VALUE : null)
  }, [])

  const showAppearance = value === APPEARANCE_VALUE

  const [query, setQuery] = useState('')

  const shownCategories = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (needle === '') return componentCategories
    // A category's overview row is not a component, so a component filter
    // should not keep it alive.
    return componentCategories
      .map((category) => ({
        ...category,
        overviewHref: undefined,
        components: category.components.filter(
          (component) =>
            component.title.toLowerCase().includes(needle) ||
            component.name.toLowerCase().includes(needle)
        )
      }))
      .filter((category) => category.components.length > 0)
  }, [componentCategories, query])

  const showComponentList =
    pathname.startsWith('/components') && !showAppearance
  // Declared only when there is a contents list — an empty drawer is worse
  // than no toggle.
  const toc = useDocHeadings()
  const showInspector = toc.headings.length >= 2 && !showAppearance

  return (
    <Navigator value={value} onValueChange={handleValueChange}>
      <Navigator.Primary aria-label='Documentation'>
        <Navigator.Brand>
          <Image
            src='/roadie-logo.png'
            alt=''
            width={32}
            height={32}
            className='size-8 shrink-0'
          />
          <span className='hidden truncate text-base font-semibold text-strong'>
            Roadie
          </span>
        </Navigator.Brand>
        {items.map((section) => {
          // A routeless section (no own page) derives a stable key/value and
          // icon from its route prefix; Navigator routes it to its first
          // sub-page. See Navigator.Item's routeless-primary behaviour.
          const firstPageHref = section.items.find(
            (item) => item.href && !item.label
          )?.href
          const sectionPrefix =
            section.href ??
            (firstPageHref ? `/${firstPageHref.split('/')[1]}` : section.title)
          // The primary link is the overview, so a sub-item that repeats the
          // section's own href is redundant — drop it.
          const subItems = section.items.filter(
            (item) => item.href !== section.href
          )
          return (
            <Navigator.Item
              key={sectionPrefix}
              value={sectionPrefix}
              href={section.href}
              icon={SECTION_ICONS[sectionPrefix] ?? <HouseIcon />}
            >
              {section.title}
              {/* Components' sub-nav is its list pane; prefix matching lights it. */}
              {sectionPrefix !== '/components' && subItems.length > 0 ? (
                <Navigator.Secondary aria-label={`${section.title} pages`}>
                  {subItems.map((item) => (
                    <Navigator.Item
                      key={item.href ?? item.title}
                      value={item.href ?? item.title}
                      href={item.href}
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
      </Navigator.Primary>

      {/* Panes are direct children — Navigator.Content matches them by element
          identity and skips anything wrapped in a fragment. */}
      <Navigator.Content>
        {showComponentList ? (
          <Pane role='list' className='lg:w-72'>
            <Pane.Header>
              <Pane.Title>Components</Pane.Title>
              <Pane.Search
                value={query}
                onValueChange={setQuery}
                placeholder='Filter components'
              />
            </Pane.Header>
            {/* No chevrons: at this width the thumbnail is the row's trailing
                content, and a caret beside it is one affordance too many. */}
            <nav aria-label='Components' className='pb-4'>
              <List>
                {shownCategories.map((category) => (
                  <List.Group key={category.name}>
                    <List.GroupTitle>{category.name}</List.GroupTitle>
                    {category.overviewHref ? (
                      <List.Item
                        title='Overview'
                        href={category.overviewHref}
                        chevron={false}
                        current={pathname === category.overviewHref && 'page'}
                      />
                    ) : null}
                    {category.components.map((component) => {
                      const href = `/components/${component.name}`
                      return (
                        <List.Item
                          key={component.name}
                          title={component.title}
                          href={href}
                          chevron={false}
                          current={pathname === href && 'page'}
                          trailing={
                            <ComponentThumbnail name={component.name} />
                          }
                        />
                      )
                    })}
                  </List.Group>
                ))}
              </List>
              {shownCategories.length === 0 ? (
                <p className='px-4 py-3 text-sm text-subtle'>No matches</p>
              ) : null}
            </nav>
          </Pane>
        ) : null}

        <Pane
          role='detail'
          current={inComponentPage || showAppearance}
          className='scroll-pt-6'
        >
          {/* backHref only turns on when a component sub-page is active. */}
          <Pane.Header backHref={inComponentPage ? '/components' : undefined}>
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
              className='mx-auto grid w-full max-w-[56rem] gap-0 px-6 py-6 md:px-10 md:py-12 lg:px-12 [&_:is(h1,h2,h3,h4)]:scroll-mt-6'
            >
              {/* The homepage and the debug routes declare no metadata.title,
                  so they render no large title and keep their own in-content
                  h1 — one h1 per page either way. */}
              {!showAppearance && pageTitles[pathname] ? (
                <Pane.BodyTitle className='mb-6 text-display-prose-1'>
                  {pageTitles[pathname]}
                </Pane.BodyTitle>
              ) : null}
              {children}
              <FooterNav items={items} />
            </div>
          )}
        </Pane>

        {/* A column from 2xl up and nothing below it — the drawer in the
            detail pane's actions is what keeps it reachable. */}
        {showInspector ? (
          <Pane role='inspector' aria-label='On this page'>
            <div className='px-4 py-6'>
              <OnThisPage {...toc} />
            </div>
          </Pane>
        ) : null}
      </Navigator.Content>
    </Navigator>
  )
}
