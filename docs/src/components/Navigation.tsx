'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Moon, Sun } from 'lucide-react'

import { Image } from '@/components/Image'

import { Button, Text, View } from '@oztix/roadie-components'
import { css } from '@oztix/roadie-core/css'

declare global {
  interface Window {
    __theme: 'light' | 'dark'
  }
}

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
    <View
      as={Link}
      href='/'
      flexDirection='row'
      alignItems='center'
      textDecoration='none'
      maxWidth='100%'
      width='100%'
      aspectRatio='1/1'
      aria-label='Go to Roadie home page'
      role='banner'
      _focus={{
        outline: '2px solid',
        outlineColor: 'accent.border.focus',
        outlineOffset: '2px',
        borderRadius: '050'
      }}
    >
      <Image
        src='/roadie-logo.png'
        alt='Roadie Design System'
        fill
        priority
        style={{ objectFit: 'contain' }}
      />
    </View>
  )
}

function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    // Initialize from window.__theme set by our script
    setTheme(window.__theme || 'light')

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const newTheme = mediaQuery.matches ? 'dark' : 'light'
      setTheme(newTheme)
      document.documentElement.classList.toggle('dark', mediaQuery.matches)
      localStorage.setItem('theme', newTheme)
      window.__theme = newTheme
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
    localStorage.setItem('theme', newTheme)
    window.__theme = newTheme
  }

  return (
    <Button
      appearance='muted'
      size='sm'
      onPress={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      className={css({ gap: '050' })}
    >
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      <Text>{theme === 'light' ? 'Dark' : 'Light'} mode</Text>
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
    <View gap='100'>
      <Text
        as={Link}
        href={item.href || '#'}
        px='100'
        fontSize='sm'
        fontWeight='semibold'
        colorPalette={isActiveParent ? 'accent' : 'neutral'}
        textDecoration='none'
        transition='colors'
        _hover={{
          color: 'colorPalette.fg.hover'
        }}
      >
        {item.title}
      </Text>
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
                  emphasis='subtle'
                  fontWeight='normal'
                  textDecoration='none'
                  transition='all 0.2s'
                  borderRadius='050'
                  data-current={isActive}
                  _hover={{
                    bg: 'accent.surface.hover',
                    color: 'accent.fg.hover'
                  }}
                  _active={{
                    bg: 'accent.surface.active',
                    color: 'accent.fg.active'
                  }}
                  css={{
                    '&[data-current=true]': {
                      color: 'accent.fg',
                      fontWeight: 'semibold'
                    }
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
    <View
      as='nav'
      position='sticky'
      top='0'
      height='100vh'
      width='220px'
      flexShrink={0}
      overflowY='auto'
      borderRight='1px solid'
      borderColor='neutral.border.muted'
      bg='neutral.surface.sunken'
      shadow='sunken'
      display={{ base: 'none', md: 'block' }}
    >
      <View gap='300' height='100%' pt='300'>
        <View flexDirection='row' alignItems='center' px='200' flexShrink={0}>
          <Logo />
        </View>
        <View px='200' gap='300' flexGrow={1} flexShrink={0}>
          {items.map((item, index) => (
            <NavigationGroup key={index} item={item} />
          ))}
        </View>
        <View
          p='200'
          mt='auto'
          position='sticky'
          bottom='0'
          bg='neutral.surface.raised'
          flexShrink={0}
          shadow='raised'
          borderTopWidth='1px'
          borderTopStyle='solid'
          borderColor='neutral.border.muted'
        >
          <ThemeToggle />
        </View>
      </View>
    </View>
  )
}
