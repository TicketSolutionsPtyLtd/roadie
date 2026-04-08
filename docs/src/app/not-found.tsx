import Link from 'next/link'

import { Button } from '@oztix/roadie-components'

export default function NotFound() {
  return (
    <main className='grid min-h-[70vh] place-content-center place-items-center gap-8 text-center'>
      <header className='grid gap-3'>
        <h1 className='text-display-prose-1 text-subtle'>404</h1>
        <h2 className='text-display-ui text-strong'>Page Not Found</h2>
      </header>
      <p className='text-lg text-subtle'>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Button size='lg' render={<Link href='/' />}>
        Return home
      </Button>
    </main>
  )
}
