'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Text, View } from '@oztix/roadie-components'

interface NavItem {
  title: string
  href: string
}

interface NavSection {
  title: string
  href: string
  items: NavItem[]
}

interface FooterNavProps {
  items: NavSection[]
}

export function FooterNav({ items }: FooterNavProps) {
  const pathname = usePathname()

  // Flatten the navigation structure
  const flatNav = items.reduce<NavItem[]>((acc, section) => {
    return [...acc, ...section.items]
  }, [])

  // Find the current page index
  const currentIndex = flatNav.findIndex((item) => item.href === pathname)

  const prev = currentIndex > 0 ? flatNav[currentIndex - 1] : undefined
  const next =
    currentIndex < flatNav.length - 1 ? flatNav[currentIndex + 1] : undefined

  if (!prev && !next) return null

  return (
    <View
      pt='600'
      borderTopWidth='1px'
      borderColor='neutral.border'
      display='flex'
      justifyContent='space-between'
      flexDirection='row'
      width='full'
    >
      {prev && (
        <View as={Link} href={prev.href} gap='100' className='group'>
          <Text textStyle='ui.meta' emphasis='subtle'>
            Previous page
          </Text>
          <Text colorPalette='accent' interactive={true}>
            ← {prev.title}
          </Text>
        </View>
      )}
      {next && (
        <View
          as={Link}
          href={next.href}
          gap='100'
          marginLeft='auto'
          textAlign='right'
          className='group'
        >
          <Text textStyle='ui.meta' emphasis='subtle'>
            Next page
          </Text>
          <Text colorPalette='accent' interactive={true}>
            {next.title} →
          </Text>
        </View>
      )}
    </View>
  )
}
