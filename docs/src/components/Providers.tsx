'use client'

import NextLink from 'next/link'

import { getAssetPath } from '@/utils/getAssetPath'

import { type RoadieLinkProps, RoadieProvider } from '@oztix/roadie-components'

const FILE_PATH = /^[^?#]*\.[a-z0-9]+(?:[?#]|$)/i

/** Routes pages through Next; a static file such as a page's `.md` twin isn't a route, so it loads plainly. */
function DocsLink({ href, ...props }: RoadieLinkProps) {
  if (FILE_PATH.test(href)) return <a href={getAssetPath(href)} {...props} />
  return <NextLink href={href} {...props} />
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RoadieProvider link={DocsLink} theme={{ followSystem: true }}>
      {children}
    </RoadieProvider>
  )
}
