'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { Moon, Sun } from 'lucide-react'

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
      href="/"
      className="relative block w-full aspect-square focus:outline-2 focus:outline-accent-9 focus:outline-offset-2 focus:rounded"
      aria-label="Go to Roadie home page"
      role="banner"
    >
      <Image
        src="/roadie-logo.png"
        alt="Roadie Design System"
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
    setColorMode(isDark ? 'dark' : 'light')
  }, [])

  const toggle = useCallback(() => {
    const next = colorMode === 'light' ? 'dark' : 'light'
    document.documentElement.classList.toggle('dark', next === 'dark')
    localStorage.setItem('theme', next)
    setColorMode(next)
  }, [colorMode])

  return (
    <Button emphasis="subtler" size="sm" onClick={toggle}
      aria-label={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`}
    >
      {colorMode === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      <Text as="span" size="sm">{colorMode === 'light' ? 'Dark' : 'Light'} mode</Text>
    </Button>
  )
}

function NavigationGroup({ item }: { item: NavigationItem }) {
  const pathname = usePathname()

  const isActiveParent = item.href
    ? item.href === '/'
      ? pathname === '/'
      : pathname.startsWith(item.href)
    : false

  return (
    <div className="flex flex-col gap-2">
      <Link
        href={item.href || '#'}
        className={`px-2 text-sm font-semibold no-underline transition-colors hover:text-accent-11 ${
          isActiveParent ? 'intent-accent emphasis-default-fg' : 'emphasis-default-fg'
        }`}
      >
        {item.title}
      </Link>
      {item.items && (
        <ul className="flex flex-col gap-0.5">
          {item.items.map((subItem) => {
            const isActive = pathname === subItem.href

            return (
              <li key={subItem.href} className="list-none p-0 m-0">
                <Link
                  href={subItem.href || '#'}
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

export function Navigation({ items }: NavigationProps) {
  return (
    <nav className="sticky top-0 h-screen w-[220px] shrink-0 overflow-y-auto border-r border-neutral-6 bg-neutral-2 hidden md:block">
      <div className="flex flex-col gap-6 h-full pt-6">
        <div className="flex items-center px-4 shrink-0">
          <Logo />
        </div>
        <div className="flex flex-col px-4 gap-6 grow shrink-0">
          {items.map((item, index) => (
            <NavigationGroup key={index} item={item} />
          ))}
        </div>
        <div className="p-4 mt-auto sticky bottom-0 bg-neutral-1 shrink-0 border-t border-neutral-6">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  )
}
