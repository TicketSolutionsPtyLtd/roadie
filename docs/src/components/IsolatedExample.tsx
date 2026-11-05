'use client'

import { useEffect, useState } from 'react'

import { usePathname } from 'next/navigation'

import { ArrowLeftIcon } from '@phosphor-icons/react'

import { exampleAt, exampleCodeHref } from '@/lib/example-code'
import type { ManifestExample } from '@/lib/example-manifest'
import { getAssetPath } from '@/utils/getAssetPath'

import { Button } from '@oztix/roadie-components/button'

import { LazyLiveRunner } from './LazyLiveRunner'

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
        <LazyLiveRunner
          loading={null}
          code={code.trim()}
          language={language}
          heightKey={href}
          previewLayout={previewLayout}
          isolated
        />
      </main>
    </div>
  )
}

const exampleTitle = ({ heading, pageTitle }: ManifestExample) =>
  `${heading ?? pageTitle} example, ${pageTitle} | Roadie Design System`

/** The example an `/examples/<page>/<id>/` address names, read in the browser so the build renders one page for them all. */
export function IsolatedExampleRoute() {
  const target = exampleAt(usePathname())
  const page = target?.page
  const id = target?.id
  const [example, setExample] = useState<ManifestExample | null>()

  useEffect(() => {
    if (!page) return
    let current = true
    fetch(getAssetPath(exampleCodeHref(page)))
      .then((response) => (response.ok ? response.json() : []))
      .then((examples: ManifestExample[]) => {
        if (!current) return
        const found = examples.find((candidate) => candidate.id === id)
        setExample(found ?? null)
      })
      .catch(() => current && setExample(null))
    return () => {
      current = false
    }
  }, [page, id])

  if (example)
    return (
      <>
        <title>{exampleTitle(example)}</title>
        <IsolatedExample {...example} />
      </>
    )
  if (example === null)
    return (
      <p className='p-6 text-display-ui-6 text-subtle'>
        This example couldn&apos;t load.
      </p>
    )
  return null
}
