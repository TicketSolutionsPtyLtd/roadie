'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import {
  CheckIcon,
  ListIcon,
  MoonIcon,
  SunIcon,
  XIcon
} from '@phosphor-icons/react'

import {
  Button,
  DEFAULT_ACCENT_COLOR,
  IconButton,
  useTheme
} from '@oztix/roadie-components'

const ACCENT_PRESETS = [
  { label: 'Blue (default)', hex: DEFAULT_ACCENT_COLOR },
  { label: 'Purple', hex: '#7C3AED' },
  { label: 'Green', hex: '#72BF44' },
  { label: 'Orange', hex: '#EA580C' },
  { label: 'Pink', hex: '#E83068' }
]

interface NavigationItem {
  title: string
  href?: string
  label?: boolean
  items?: NavigationItem[]
}

interface NavigationProps {
  items: NavigationItem[]
}

function ThemeToggle() {
  const { isDark, setDark } = useTheme()

  return (
    <Button
      size='sm'
      className='w-full'
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
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setIsOpen(false), [])

  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen, close])

  return (
    <div ref={ref} className='relative'>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='size-8 rounded-full border-subtle ring-0 ring-accent-6 transition-shadow hover:ring-4'
        style={{ backgroundColor: accentColor }}
        aria-label='Change accent color'
      />
      {isOpen && (
        <div className='absolute -right-1 bottom-full mb-2 grid justify-items-center gap-1.5 rounded-xl emphasis-floating p-2'>
          <h3 className='text-medium text-sm'>Accent color</h3>
          <div className='flex gap-1.5'>
            {ACCENT_PRESETS.map((preset) => {
              const isActive =
                accentColor.toLowerCase() === preset.hex.toLowerCase()
              return (
                <button
                  key={preset.hex}
                  onClick={() => {
                    setAccentColor(preset.hex)
                    close()
                  }}
                  className='grid size-7 place-items-center rounded-full ring-0 ring-neutral-5 transition-transform hover:scale-110 hover:shadow-lg hover:ring-2'
                  style={{ backgroundColor: preset.hex }}
                  aria-label={preset.label}
                >
                  {isActive && (
                    <CheckIcon
                      weight='bold'
                      className='size-3.5 text-neutral-0'
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function NavigationGroup({
  item,
  onNavigate
}: {
  item: NavigationItem
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  const isActiveParent = item.href
    ? item.href === '/'
      ? pathname === '/'
      : pathname.startsWith(item.href)
    : false

  return (
    <div className='grid gap-2'>
      <Link
        href={item.href || '#'}
        onClick={onNavigate}
        className={`px-2 text-sm font-semibold no-underline transition-colors hover:text-accent-11 ${
          isActiveParent ? 'text-normal intent-accent' : 'text-normal'
        }`}
      >
        {item.title}
      </Link>
      {item.items && (
        <ul className='grid gap-0.5'>
          {item.items.map((subItem) => {
            if (subItem.label) {
              return (
                <li
                  key={subItem.title}
                  className='m-0 list-none px-2 pt-3 pb-1 text-xs font-semibold text-subtler'
                >
                  {subItem.href ? (
                    <Link
                      href={subItem.href}
                      onClick={onNavigate}
                      className='text-subtler no-underline transition-colors hover:text-accent-11'
                    >
                      {subItem.title}
                    </Link>
                  ) : (
                    subItem.title
                  )}
                </li>
              )
            }

            const isActive = pathname === subItem.href

            return (
              <li
                key={subItem.href ?? subItem.title}
                className='m-0 list-none p-0'
              >
                <Link
                  href={subItem.href || '#'}
                  onClick={onNavigate}
                  className={`block rounded-sm px-2 py-1 text-sm no-underline transition-all hover:bg-accent-3 hover:text-accent-11 ${
                    isActive
                      ? 'font-semibold text-accent-11'
                      : 'font-normal text-subtle'
                  }`}
                >
                  {subItem.title}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function NavigationContent({
  items,
  onNavigate
}: {
  items: NavigationItem[]
  onNavigate?: () => void
}) {
  return (
    <div className='flex h-full flex-col gap-6 pt-6'>
      <div className='flex shrink-0 grow flex-col gap-6 px-4'>
        {items.map((item, index) => (
          <NavigationGroup key={index} item={item} onNavigate={onNavigate} />
        ))}
      </div>
      <div className='sticky bottom-0 mt-auto flex shrink-0 items-center gap-2 border border-t-subtle bg-raised p-4'>
        <ThemeToggle />
        <AccentPicker />
      </div>
    </div>
  )
}

export function Navigation({ items }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Close on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: close nav when route changes
    setIsOpen(false)
  }, [pathname])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <>
      {/* Mobile hamburger */}
      <IconButton
        onClick={() => setIsOpen(true)}
        emphasis='normal'
        className='fixed top-3 left-3 z-50 md:hidden'
        aria-label='Open navigation'
      >
        <ListIcon weight='bold' className='size-5' />
      </IconButton>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className='bg-black/30 fixed inset-0 z-40 backdrop-blur-sm md:hidden'
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile slide-out nav */}
      <nav
        className={`fixed top-0 left-0 z-50 h-screen w-[280px] overflow-y-auto emphasis-sunken transition-transform duration-200 ease-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <IconButton
          onClick={() => setIsOpen(false)}
          emphasis='subtler'
          className='absolute top-3 right-3'
          aria-label='Close navigation'
        >
          <XIcon weight='bold' className='size-5' />
        </IconButton>
        <NavigationContent items={items} onNavigate={() => setIsOpen(false)} />
      </nav>

      {/* Desktop sidebar */}
      <nav className='sticky top-0 hidden h-screen w-[220px] shrink-0 overflow-y-auto emphasis-sunken md:block'>
        <NavigationContent items={items} />
      </nav>
    </>
  )
}
