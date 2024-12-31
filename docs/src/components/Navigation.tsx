'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Button, Text, View } from '@oztix/roadie-components'
import { css } from '@oztix/roadie-core/css'
import { Moon, Speaker, Sun } from 'lucide-react'

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
      className={css({
        display: 'flex',
        alignItems: 'center',
        gap: '050',
        color: 'fg.default',
        textDecoration: 'none',
        fontWeight: 'semibold',
        fontSize: 'lg'
      })}
    >
      <Speaker size={24} className={css({ color: 'accent.default' })} />
      Roadie
    </Link>
  )
}

function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setTheme(isDark ? 'dark' : 'light')
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <Button
      appearance='ghost'
      size='sm'
      onPress={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
    </Button>
  )
}

function NavigationGroup({ item }: { item: NavigationItem }) {
  const pathname = usePathname()

  const isActiveParent = item.href ? pathname.startsWith(item.href) : false

  return (
    <View gap='100'>
      <Link
        href={item.href || '#'}
        className={css({
          px: '100',
          fontSize: 'sm',
          fontWeight: 'semibold',
          color: isActiveParent ? 'fg.accent' : 'fg.default',
          textDecoration: 'none',
          transition: 'colors',
          _hover: {
            color: 'accent.default'
          }
        })}
      >
        {item.title}
      </Link>
      {item.items && (
        <View as='ul' gap='025'>
          {item.items.map((subItem) => {
            const isActive = pathname === subItem.href

            return (
              <View as='li' key={subItem.href} listStyleType='none' p='0' m='0'>
                <Text
                  as={Link}
                  href={subItem.href || '#'}
                  display='block'
                  px='100'
                  py='050'
                  fontSize='sm'
                  color={isActive ? 'fg.accent' : 'fg.subtle'}
                  fontWeight={isActive ? 'semibold' : 'normal'}
                  textDecoration='none'
                  transition='all 0.2s'
                  borderRadius='050'
                  _hover={{
                    bg: 'bg.accent.hovered',
                    color: isActive ? 'fg.accent.pressed' : 'fg.accent.hovered'
                  }}
                  _active={{
                    bg: 'bg.accent.pressed',
                    color: 'fg.accent.pressed'
                  }}
                >
                  {subItem.title}
                </Text>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

export function Navigation({ items }: NavigationProps) {
  return (
    <nav
      className={css({
        position: 'sticky',
        top: '0',
        height: '100vh',
        width: '220px',
        flexShrink: 0,
        overflowY: 'auto',
        px: '200',
        py: '400',
        borderRight: '1px solid',
        borderColor: 'border.subtlest',
        bg: 'bg.sunken',
        display: { base: 'none', md: 'block' }
      })}
    >
      <View gap='300'>
        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: '100',
            borderBottomWidth: '1px',
            borderColor: 'border.subtlest'
          })}
        >
          <Logo />
          <ThemeToggle />
        </div>
        <View gap='300'>
          {items.map((item, index) => (
            <NavigationGroup key={index} item={item} />
          ))}
        </View>
      </View>
    </nav>
  )
}
