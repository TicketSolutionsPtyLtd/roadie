import Link from 'next/link'

import { Button, Heading, Text } from '@oztix/roadie-components'

export default function NotFound() {
  return (
    <main className='flex flex-col gap-8 text-center items-center justify-center min-h-[70vh]'>
      <header className='flex flex-col gap-3'>
        <Heading as='h1' className='text-display-prose-1' emphasis='subtle'>
          404
        </Heading>
        <Heading>Page Not Found</Heading>
      </header>
      <Text emphasis='subtle' size='lg'>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </Text>
      <Button size='lg' render={<Link href='/' />}>
        Return home
      </Button>
    </main>
  )
}
