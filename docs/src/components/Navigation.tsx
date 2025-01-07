'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Moon, Speaker, Sun } from 'lucide-react'

import { Button, Text, View } from '@oztix/roadie-components'

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
      gap='050'
      color='accent.fg.strong'
      textDecoration='none'
      fontWeight='semibold'
      fontSize='lg'
    >
      <Speaker size={24} />
      Roadie
    </View>
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
      appearance='muted'
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
      px='200'
      py='400'
      borderRight='1px solid'
      borderColor='neutral.border.muted'
      bg='neutral.surface.sunken'
      shadow='sunken'
      display={{ base: 'none', md: 'block' }}
    >
      <View gap='300'>
        <View
          display='flex'
          flexDirection='row'
          alignItems='center'
          justifyContent='space-between'
          px='100'
          borderBottomWidth='1px'
          borderColor='neutral.border.subtle'
        >
          <Logo />
          <ThemeToggle />
        </View>
        <View gap='300'>
          {items.map((item, index) => (
            <NavigationGroup key={index} item={item} />
          ))}
        </View>
      </View>
    </View>
  )
}
