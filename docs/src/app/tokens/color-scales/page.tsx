import { ScaleGrid } from '@/components/tokens/FamilyVisuals'
import { TokenFamilyPage } from '@/components/tokens/TokenFamilyPage'

import { Code } from '@oztix/roadie-components/code'

export const metadata = {
  title: 'Color scales',
  description:
    'Eight OKLCH palettes of 14 steps each, plus the accent parameters, pinned light steps and illustration colours.',
  category: 'Color',
  order: 1
}

export default function ColorScalesTokensPage() {
  return (
    <TokenFamilyPage
      family='color-scales'
      intro={
        <>
          Step 0 is the page and step 13 the strongest text; dark mode swaps the
          values and keeps the step numbers. Neutral and accent follow{' '}
          <Code>--accent-hue</Code>. Brand secondary ships as variables only,
          with no <Code>bg-*</Code> classes.
        </>
      }
    >
      <ScaleGrid />
    </TokenFamilyPage>
  )
}
