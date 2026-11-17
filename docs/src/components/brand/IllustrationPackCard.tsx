import { ILLUSTRATION_PACK, illustrationPackSize } from '@/lib/spot-sources'

import { DownloadCard } from './DownloadCard'

/** The download card for every spot illustration, sized from the zip the build makes. */
export async function IllustrationPackCard() {
  return (
    <DownloadCard {...ILLUSTRATION_PACK} size={await illustrationPackSize()} />
  )
}
