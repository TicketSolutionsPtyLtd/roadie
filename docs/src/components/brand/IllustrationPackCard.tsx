import { illustrationPackSize } from '@/lib/spot-sources'

import { DownloadCard } from './DownloadCard'

/** The download card for every spot illustration, sized from the zip the build makes. */
export async function IllustrationPackCard() {
  return (
    <DownloadCard
      title='Illustration pack'
      href='/brand/illustration/oztix-illustration-pack.zip'
      formats='SVG'
      size={await illustrationPackSize()}
      description='Every spot illustration in the library, as an SVG in its brand colours.'
    />
  )
}
