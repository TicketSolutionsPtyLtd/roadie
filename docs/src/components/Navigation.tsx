'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { ListIcon, MoonIcon, SunIcon, XIcon } from '@phosphor-icons/react'

import { Image } from '@/components/Image'

import { Button, useTheme } from '@oztix/roadie-components'

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
      className='relative block aspect-square w-full focus:rounded focus:outline-2 focus:outline-offset-2 focus:outline-accent-9'
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
  const { isDark, setDark } = useTheme()

  return (
    <Button
      emphasis='subtler'
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
      <span className='text-sm'>{isDark ? 'Light' : 'Dark'} mode</span>
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
        className='is-interactive fixed top-3 left-3 z-50 flex size-10 emphasis-normal items-center justify-center rounded-lg md:hidden'
        aria-label='Open navigation'
      >
        <ListIcon weight='bold' className='size-5' />
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
          <XIcon weight='bold' className='size-5' />
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
