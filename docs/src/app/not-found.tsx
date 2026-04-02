import Link from 'next/link'

import { Button } from '@oztix/roadie-components'

export default function NotFound() {
  return (
    <main className='flex flex-col gap-8 text-center items-center justify-center min-h-[70vh]'>
      <header className='flex flex-col gap-3'>
        <h1 className='text-display-prose-1 text-subtle'>404</h1>
        <h2 className='text-display-ui text-strong'>Page Not Found</h2>
      </header>
      <p className='text-subtle text-lg'>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Button size='lg' render={<Link href='/' />}>
        Return home
      </Button>
    </main>
  )
}
