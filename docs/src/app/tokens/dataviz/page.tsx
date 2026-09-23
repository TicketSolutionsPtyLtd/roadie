import { ValidatorScores } from '@/components/dataviz/ValidatorScores'
import { TokenFamilyPage } from '@/components/tokens/TokenFamilyPage'

import { Code } from '@oztix/roadie-components/code'

export const metadata = {
  title: 'Data visualisation',
  description:
    'Chart colours for identity, amount, above or below a benchmark, and status, in light and dark.',
  category: 'Color',
  order: 3
}

export default function DatavizTokensPage() {
  return (
    <TokenFamilyPage
      family='dataviz'
      intro={
        <>
          Every chart colour comes from <Code>palette.ts</Code> in core and is
          checked for colour-blind separation in CI. Use the CSS variables in
          dashboards and <Code>@oztix/roadie-core/dataviz</Code> where a
          renderer can’t read CSS.
        </>
      }
    >
      <ValidatorScores />
    </TokenFamilyPage>
  )
}
