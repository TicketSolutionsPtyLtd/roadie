import Link from 'next/link'

import { getAssetPath } from '@/utils/getAssetPath'

// A static export can't redirect, so an old release URL refreshes to its new page.
export function ReleaseMoved({ href }: { href: string }) {
  return (
    <>
      <meta httpEquiv='refresh' content={`0; url=${getAssetPath(href)}/`} />
      <p className='text-display-ui-6 text-subtle'>
        This release moved to <Link href={href}>its own page</Link>.
      </p>
    </>
  )
}
