'use client'

import { Suspense, lazy } from 'react'

import { ArrowLeftIcon } from '@phosphor-icons/react'

import type { ManifestExample } from '@/lib/example-manifest'

import { Button } from '@oztix/roadie-components/button'

const LiveRunner = lazy(() => import('./LiveRunner'))

/** One live example on its own page, with nothing else from the docs page loaded. */
export function IsolatedExample({
  code,
  language,
  href,
  backHref,
  pageTitle,
  heading,
  previewLayout
}: ManifestExample) {
  return (
    <div className='grid min-h-dvh grid-rows-[auto_1fr]'>
      <header className='flex min-w-0 items-center gap-3 border-b border-subtle bg-normal px-4 py-2'>
        <Button href={backHref} size='sm' emphasis='subtler'>
          <ArrowLeftIcon weight='bold' className='size-4' />
          {pageTitle}
        </Button>
        {heading && (
          <p className='min-w-0 truncate text-sm text-subtle'>{heading}</p>
        )}
      </header>
      <main className='min-w-0 p-4 sm:p-6'>
        <Suspense fallback={null}>
          <LiveRunner
            code={code.trim()}
            language={language}
            heightKey={href}
            previewLayout={previewLayout}
            isolated
          />
        </Suspense>
      </main>
    </div>
  )
}
