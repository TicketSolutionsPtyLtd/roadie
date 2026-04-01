'use client'

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { List, Moon, Sun, X } from '@phosphor-icons/react'

import { Image } from '@/components/Image'

import { Button, Text } from '@oztix/roadie-components'

interface NavigationItem {
  title: string
  href?: string
  items?: NavigationItem[]
}

interface NavigationProps {
  items: NavigationItem[]
}

function Logo() {
  return (
    <Link
      href='/'
      className='relative block w-full aspect-square focus:outline-2 focus:outline-accent-9 focus:outline-offset-2 focus:rounded'
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
      <Text as='span' size='sm'>
        {colorMode === 'light' ? 'Dark' : 'Light'} mode
      </Text>
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
    <div className='flex flex-col gap-2'>
      <Link
        href={item.href || '#'}
        onClick={onNavigate}
        className={`px-2 text-sm font-semibold no-underline transition-colors hover:text-accent-11 ${
          isActiveParent
            ? 'intent-accent emphasis-default-fg'
            : 'emphasis-default-fg'
        }`}
      >
        {item.title}
      </Link>
      {item.items && (
        <ul className='flex flex-col gap-0.5'>
          {item.items.map((subItem) => {
            const isActive = pathname === subItem.href

            return (
              <li key={subItem.href} className='list-none p-0 m-0'>
                <Link
                  href={subItem.href || '#'}
                  onClick={onNavigate}
                  className={`block px-2 py-1 text-sm no-underline transition-all rounded-sm hover:bg-accent-3 hover:text-accent-11 ${
                    isActive
                      ? 'text-accent-11 font-semibold'
                      : 'emphasis-subtle-fg font-normal'
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
    <div className='flex flex-col gap-6 h-full pt-6'>
      <div className='flex items-center px-4 shrink-0'>
        <Logo />
      </div>
      <div className='flex flex-col px-4 gap-6 grow shrink-0'>
        {items.map((item, index) => (
          <NavigationGroup key={index} item={item} onNavigate={onNavigate} />
        ))}
      </div>
      <div className='p-4 mt-auto sticky bottom-0 emphasis-sunken-surface shrink-0'>
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
        className='fixed top-3 left-3 z-50 flex md:hidden items-center justify-center size-10 rounded-lg emphasis-default is-interactive'
        aria-label='Open navigation'
      >
        <List size={20} weight='bold' />
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className='fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden'
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile slide-out nav */}
      <nav
        className={`fixed top-0 left-0 z-50 h-screen w-[280px] emphasis-sunken overflow-y-auto transition-transform duration-200 ease-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setIsOpen(false)}
          className='absolute top-3 right-3 flex items-center justify-center size-10 rounded-lg emphasis-subtler is-interactive'
          aria-label='Close navigation'
        >
          <X size={20} weight='bold' />
        </button>
        <NavigationContent items={items} onNavigate={() => setIsOpen(false)} />
      </nav>

      {/* Desktop sidebar */}
      <nav className='sticky top-0 h-screen w-[220px] shrink-0 overflow-y-auto emphasis-sunken hidden md:block'>
        <NavigationContent items={items} />
      </nav>
    </>
  )
}
