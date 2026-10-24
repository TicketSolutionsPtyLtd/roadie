'use client'

import { useEffect, useRef, useState } from 'react'

import {
  CheckIcon,
  CopyIcon,
  DotsThreeIcon,
  DownloadSimpleIcon,
  ImageIcon,
  MagnifyingGlassIcon
} from '@phosphor-icons/react'

import {
  BRAND_ILLUSTRATIONS,
  type BrandIllustration
} from '@/lib/brand-illustrations'
import { getAssetPath } from '@/utils/getAssetPath'

import { Button, IconButton } from '@oztix/roadie-components/button'
import { Card } from '@oztix/roadie-components/card'
import { EmptyState } from '@oztix/roadie-components/empty-state'
import { Field } from '@oztix/roadie-components/field'
import { Menu } from '@oztix/roadie-components/menu'

import { Image } from '../Image'
import { useCopy } from '../useCopy'

const PNG_SIZE = 1024

export const illustrationSrc = (slug: string) =>
  getAssetPath(`/brand/illustrations/${slug}.svg`)

/** Illustrations whose label, tags, or component name hold every word of the query. */
export function filterIllustrations(
  illustrations: BrandIllustration[],
  query: string
) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return illustrations.filter((illustration) => {
    const haystack = [
      illustration.label,
      ...illustration.tags,
      illustration.component ?? ''
    ]
      .join(' ')
      .toLowerCase()
    return words.every((word) => haystack.includes(word))
  })
}

async function svgMarkup(slug: string) {
  const response = await fetch(illustrationSrc(slug))
  if (!response.ok) throw new Error(`No SVG for ${slug}`)
  return response.text()
}

function saveFile(href: string, name: string) {
  const link = document.createElement('a')
  link.href = href
  link.download = name
  link.click()
}

// Drawn in the browser from the SVG, so the docs ship no PNG files.
async function downloadPng(slug: string) {
  const image = new window.Image()
  image.src = illustrationSrc(slug)
  await image.decode()
  const scale = PNG_SIZE / Math.max(image.naturalWidth, image.naturalHeight)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.naturalWidth * scale)
  canvas.height = Math.round(image.naturalHeight * scale)
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png')
  )
  if (!blob) throw new Error(`Couldn't draw ${slug}`)
  const href = URL.createObjectURL(blob)
  saveFile(href, `oztix-${slug}.png`)
  // Some browsers start the download after the click returns.
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}

async function downloadSvg(slug: string) {
  saveFile(illustrationSrc(slug), `oztix-${slug}.svg`)
}

type Format = 'SVG' | 'PNG'
type DownloadState = { format: Format; ok: boolean } | undefined

function useDownload(slug: string) {
  const [state, setState] = useState<DownloadState>()
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const download = async (format: Format) => {
    clearTimeout(timer.current)
    try {
      await (format === 'PNG' ? downloadPng(slug) : downloadSvg(slug))
      setState({ format, ok: true })
    } catch {
      setState({ format, ok: false })
    }
    timer.current = setTimeout(() => setState(undefined), 2000)
  }

  return { state, download }
}

function IllustrationTile({
  illustration
}: {
  illustration: BrandIllustration
}) {
  const { slug, label, tags, component } = illustration
  const { copied, failed, copy } = useCopy()
  const { state, download } = useDownload(slug)
  const announcement = copied
    ? `Copied the SVG of ${label}`
    : failed
      ? `Couldn't copy the SVG of ${label}`
      : state?.ok
        ? `Downloaded the ${state.format} of ${label}`
        : state
          ? `Couldn't download the ${state.format} of ${label}`
          : ''

  return (
    <li data-slot='illustration-tile' data-twin-row className='grid'>
      {/* The body takes the spare height, so footers line up across a row. */}
      <Card
        emphasis='raised'
        className='grid-rows-[1fr_auto] content-stretch gap-3'
      >
        <Card.Content className='grid content-start gap-3 px-3 pt-3 pb-0'>
          <Image
            src={`/brand/illustrations/${slug}.svg`}
            alt=''
            width={96}
            height={96}
            className='size-24 justify-self-center'
          />
          <div className='grid gap-0.5'>
            <p data-twin-cell className='text-sm font-semibold text-strong'>
              {label}
            </p>
            <p data-twin-cell className='text-xs text-subtle'>
              {tags.join(', ')}
            </p>
            <code data-twin-cell className='sr-only'>
              {`/brand/illustrations/${slug}.svg`}
            </code>
            {component ? (
              <code data-twin-cell className='font-mono text-xs text-subtler'>
                {component}
              </code>
            ) : (
              <span data-twin-cell />
            )}
          </div>
        </Card.Content>
        <Card.Footer className='gap-1 px-3 pb-3'>
          <Button
            size='xs'
            emphasis='normal'
            aria-label={`Copy SVG of ${label}`}
            onClick={() => copy(svgMarkup(slug))}
            className='min-w-0 flex-1'
          >
            {copied ? (
              <CheckIcon weight='bold' className='size-4' />
            ) : (
              <CopyIcon weight='bold' className='size-4' />
            )}
            {copied ? 'Copied' : failed ? "Couldn't copy" : 'Copy SVG'}
          </Button>
          <Menu>
            <Menu.Trigger
              render={
                <IconButton
                  size='xs'
                  emphasis='normal'
                  aria-label={`More options for ${label}`}
                >
                  <DotsThreeIcon weight='bold' className='size-4' />
                </IconButton>
              }
            />
            <Menu.Content>
              <Menu.Item
                icon={<DownloadSimpleIcon weight='bold' />}
                onClick={() => download('SVG')}
              >
                Download SVG
              </Menu.Item>
              <Menu.Item
                icon={<ImageIcon weight='bold' />}
                onClick={() => download('PNG')}
              >
                Download PNG
              </Menu.Item>
            </Menu.Content>
          </Menu>
        </Card.Footer>
      </Card>
      <span aria-live='polite' className='sr-only'>
        {announcement}
      </span>
    </li>
  )
}

/** Every brand illustration, searchable by label and tag, with Copy SVG and Download PNG on each. */
export function IllustrationLibrary() {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const results = filterIllustrations(BRAND_ILLUSTRATIONS, query)

  return (
    <div data-not-prose data-slot='illustration-library' className='grid gap-6'>
      <Field role='search' className='relative'>
        <Field.Label className='sr-only'>Search illustrations</Field.Label>
        <Field.Input
          ref={inputRef}
          type='search'
          aria-label='Search illustrations'
          placeholder='Search illustrations, such as tickets or music'
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className='ps-10'
        />
        <MagnifyingGlassIcon
          aria-hidden
          weight='bold'
          className='pointer-events-none absolute inset-s-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle'
        />
      </Field>

      <p aria-live='polite' className='text-sm text-subtle'>
        {results.length} of {BRAND_ILLUSTRATIONS.length} illustrations
      </p>

      {results.length === 0 ? (
        <EmptyState size='sm'>
          <EmptyState.IconTile>
            <MagnifyingGlassIcon weight='bold' />
          </EmptyState.IconTile>
          <EmptyState.Title>No illustrations found</EmptyState.Title>
          <EmptyState.Description>
            Nothing matches &ldquo;{query.trim()}&rdquo;. Try a word such as
            music, tickets, or growth.
          </EmptyState.Description>
          <EmptyState.Actions>
            <Button
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
            >
              Clear search
            </Button>
          </EmptyState.Actions>
        </EmptyState>
      ) : (
        <ul className='grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2'>
          {results.map((illustration) => (
            <IllustrationTile
              key={illustration.slug}
              illustration={illustration}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
