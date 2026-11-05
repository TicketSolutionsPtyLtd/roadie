import Link from 'next/link'

import { getAssetPath } from '@/utils/getAssetPath'

// Not `permanentRedirect()`, so the URL keeps the trailing slash Pages serves and gets a canonical and noindex.
export function ReleaseMoved({ href }: { href: string }) {
  return (
    <>
      <meta httpEquiv='refresh' content={`0; url=${getAssetPath(href)}/`} />
      <p className='text-display-ui-6 text-subtle'>
        This release moved to a new address.{' '}
        <Link href={href}>Go to the release</Link>
      </p>
    </>
  )
}
