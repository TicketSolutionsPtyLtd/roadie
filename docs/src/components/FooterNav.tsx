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
  const next = currentIndex < flatNav.length - 1 ? flatNav[currentIndex + 1] : undefined

  if (!prev && !next) return null

  return (
    <View
      pt='600'
      borderTopWidth='1px'
      borderColor='border'
      display='flex'
      justifyContent='space-between'
      flexDirection='row'
      width='full'
    >
      {prev && (
        <View
          as={Link}
          href={prev.href}
          gap='100'
          textDecoration='none'
          _hover={{ textDecoration: 'underline' }}
        >
          <Text fontSize='sm' color='fg.subtle'>
            Previous page
          </Text>
          <Text color='fg.accent'>← {prev.title}</Text>
        </View>
      )}
      {next && (
        <View
          as={Link}
          href={next.href}
          gap='100'
          textDecoration='none'
          marginLeft='auto'
          textAlign='right'
          _hover={{ textDecoration: 'underline' }}
        >
          <Text fontSize='sm' color='fg.subtle'>
            Next page
          </Text>
          <Text color='fg.accent'>{next.title} →</Text>
        </View>
      )}
    </View>
  )
}
