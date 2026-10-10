import { breakpoints } from '@/lib/foundation-scales'
import { getTokens } from '@/lib/tokens'

import { SizeList } from './SizeList'

/** The viewport breakpoints, each with its variant prefix and width. */
export async function BreakpointScale() {
  return (
    <SizeList slot='breakpoint-scale' sizes={breakpoints(await getTokens())} />
  )
}
