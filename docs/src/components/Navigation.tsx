'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Moon, Sun } from 'lucide-react'

import { Image } from '@/components/Image'

import { Button, Text, View } from '@oztix/roadie-components'
import { useColorMode } from '@oztix/roadie-components/hooks'
import { toggleColorMode } from '@oztix/roadie-core'

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
  const colorMode = useColorMode()

  return (
    <Button
      emphasis='subtler'
      size='sm'
      gap='050'
      onClick={() => toggleColorMode()}
      aria-label={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`}
    >
      {colorMode === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      <Text>{colorMode === 'light' ? 'Dark' : 'Light'} mode</Text>
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
        asChild
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
        <Link href={item.href || '#'}>{item.title}</Link>
      </Text>
      {item.items && (
        <View as='ul' gap='025'>
          {item.items.map((subItem) => {
            const isActive = pathname === subItem.href

            return (
              <View as='li' key={subItem.href} listStyleType='none' p='0' m='0'>
                <Text
                  asChild
                  display='block'
                  px='100'
                  py='050'
                  fontSize='sm'
                  emphasis='subtle'
                  fontWeight='normal'
                  textDecoration='none'
                  transition='all 0.2s'
                  borderRadius='sm'
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
                  <Link href={subItem.href || '#'}>{subItem.title}</Link>
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
      borderRightWidth='1px'
      borderRightStyle='solid'
      borderColor='neutral.border.subtler'
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
          borderColor='neutral.border.subtler'
        >
          <ThemeToggle />
        </View>
      </View>
    </View>
  )
}
