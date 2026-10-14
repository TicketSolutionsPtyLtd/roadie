import { DownloadSimpleIcon, FileZipIcon } from '@phosphor-icons/react/ssr'

import { getAssetPath } from '@/utils/getAssetPath'

import { Button } from '@oztix/roadie-components/button'
import { IconTile } from '@oztix/roadie-components/icon-tile'

/** A download beside the asset it belongs to: what it holds, its formats and size, and a button. */
export function DownloadCard({
  title,
  href,
  formats,
  size,
  description
}: {
  title: string
  /** A file under `public/`, such as `/brand/logo/oztix-logo-pack.zip`. */
  href: string
  formats: string
  size: string
  description: string
}) {
  return (
    <div
      data-not-prose
      data-slot='download-card'
      className='grid emphasis-raised grid-cols-[auto_1fr] items-start gap-4 rounded-xl p-4'
    >
      <IconTile intent='brand-blue' emphasis='subtle'>
        <FileZipIcon weight='bold' />
      </IconTile>
      <div className='grid justify-items-start gap-3'>
        <div className='grid gap-1'>
          <p className='text-display-ui-6 text-strong'>{title}</p>
          <p className='text-sm text-subtle'>{description}</p>
          <p className='text-sm text-subtler'>
            {formats}, {size}
          </p>
        </div>
        <Button href={getAssetPath(href)} download size='sm'>
          <DownloadSimpleIcon weight='bold' className='size-4' />
          Download
        </Button>
      </div>
    </div>
  )
}
