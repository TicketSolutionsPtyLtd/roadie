'use client'

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { List, Moon, Sun, X } from '@phosphor-icons/react'

import { Image } from '@/components/Image'

import { Button } from '@oztix/roadie-components'

interface NavigationItem {
  title: string
  href?: string
  label?: boolean
  items?: NavigationItem[]
}

interface NavigationProps {
  items: NavigationItem[]
}

function Logo() {
  return (
    <Link
      href='/'
      className='focus:outline-accent-9 relative block aspect-square w-full focus:rounded focus:outline-2 focus:outline-offset-2'
      aria-label='Go to Roadie home page'
      role='banner'
    >
      <Image
        src='/roadie-logo.png'
        alt='Roadie Design System'
        fill
        priority
        style={{ objectFit: 'contain' }}
      />
    </Link>
  )
}

function ThemeToggle() {
  const [colorMode, setColorMode] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading DOM state on mount
    setColorMode(isDark ? 'dark' : 'light')
  }, [])

  const toggle = useCallback(() => {
    const next = colorMode === 'light' ? 'dark' : 'light'
    document.documentElement.classList.toggle('dark', next === 'dark')
    localStorage.setItem('theme', next)
    setColorMode(next)
  }, [colorMode])

  return (
    <Button
      emphasis='subtler'
      size='sm'
      className='w-full'
      onClick={toggle}
      aria-label={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`}
    >
      {colorMode === 'light' ? (
        <Moon size={16} weight='bold' />
      ) : (
        <Sun size={16} weight='bold' />
      )}
      <span className='text-sm'>
        {colorMode === 'light' ? 'Dark' : 'Light'} mode
      </span>
    </Button>
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
        className={`hover:text-accent-11 px-2 text-sm font-semibold no-underline transition-colors ${
          isActiveParent ? 'text-default intent-accent' : 'text-default'
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
                  {subItem.title}
                </li>
              )
            }

            const isActive = pathname === subItem.href

            return (
              <li key={subItem.href} className='m-0 list-none p-0'>
                <Link
                  href={subItem.href || '#'}
                  onClick={onNavigate}
                  className={`hover:bg-accent-3 hover:text-accent-11 block rounded-sm px-2 py-1 text-sm no-underline transition-all ${
                    isActive
                      ? 'text-accent-11 font-semibold'
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
      <div className='flex shrink-0 items-center px-4'>
        <Logo />
      </div>
      <div className='flex shrink-0 grow flex-col gap-6 px-4'>
        {items.map((item, index) => (
          <NavigationGroup key={index} item={item} onNavigate={onNavigate} />
        ))}
      </div>
      <div className='sticky bottom-0 mt-auto shrink-0 bg-sunken p-4'>
        <ThemeToggle />
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
      <button
        onClick={() => setIsOpen(true)}
        className='is-interactive fixed top-3 left-3 z-50 flex size-10 emphasis-default items-center justify-center rounded-lg md:hidden'
        aria-label='Open navigation'
      >
        <List size={20} weight='bold' />
      </button>

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
        <button
          onClick={() => setIsOpen(false)}
          className='is-interactive absolute top-3 right-3 flex size-10 items-center justify-center rounded-lg emphasis-subtler'
          aria-label='Close navigation'
        >
          <X size={20} weight='bold' />
        </button>
        <NavigationContent items={items} onNavigate={() => setIsOpen(false)} />
      </nav>

      {/* Desktop sidebar */}
      <nav className='sticky top-0 hidden h-screen w-[220px] shrink-0 overflow-y-auto emphasis-sunken md:block'>
        <NavigationContent items={items} />
      </nav>
    </>
  )
}
