import { containers } from '@/lib/foundation-scales'
import { getTokens } from '@/lib/tokens'

import { SizeList } from './SizeList'

/** The container widths, each with its container-* class and max width. */
export async function ContainerScale() {
  return (
    <SizeList slot='container-scale' sizes={containers(await getTokens())} />
  )
}
