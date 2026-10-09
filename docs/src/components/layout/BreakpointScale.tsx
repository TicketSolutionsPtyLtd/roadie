import { getFamilyTokens } from '@/lib/tokens'

import { SizeList } from './SizeList'

/** The viewport breakpoints, each with its variant prefix and width. */
export async function BreakpointScale() {
  const breakpoints = (await getFamilyTokens('shape'))
    .filter(({ group }) => group === 'Breakpoints')
    .map(({ name, value }) => ({
      name: `${name.replace('--breakpoint-', '')}:`,
      rem: value!.light!
    }))

  return <SizeList slot='breakpoint-scale' sizes={breakpoints} />
}
