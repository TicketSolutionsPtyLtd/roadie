import Link from 'next/link'

import { Text, View } from '@oztix/roadie-components'

interface FooterProps {
  prev?: { title: string; href: string }
  next?: { title: string; href: string }
}

export function Footer({ prev, next }: FooterProps) {
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
          <Text size='sm' color='fg.subtle'>
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
          <Text size='sm' color='fg.subtle'>
            Next page
          </Text>
          <Text color='fg.accent'>{next.title} →</Text>
        </View>
      )}
    </View>
  )
}
