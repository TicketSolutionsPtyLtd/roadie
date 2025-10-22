import Link from 'next/link'

import { Button, Heading, Text, View } from '@oztix/roadie-components'

export default function NotFound() {
  return (
    <View
      as='main'
      gap='400'
      textAlign='center'
      alignItems='center'
      justifyContent='center'
      minHeight='70vh'
    >
      <View as='header' gap='200'>
        <Heading as='h1' textStyle='display.prose.1' color='neutral.fg.subtle'>
          404
        </Heading>
        <Heading as='h2' textStyle='display.prose.2'>
          Page Not Found
        </Heading>
      </View>
      <Text textStyle='prose.lead' emphasis='subtle'>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </Text>
      <Button asChild size='lg'>
        <Link href='/'>Return home</Link>
      </Button>
    </View>
  )
}
