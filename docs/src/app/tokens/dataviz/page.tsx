import { ValidatorScores } from '@/components/dataviz/ValidatorScores'
import { TokenFamilyPage } from '@/components/tokens/TokenFamilyPage'

export const metadata = {
  title: 'Data visualisation',
  tokenFamily: 'dataviz',
  description:
    'Chart colours for identity, amount, above or below a benchmark, and status, in light and dark.',
  category: 'Color',
  order: 3
}

export default function DatavizTokensPage() {
  return (
    <TokenFamilyPage family='dataviz'>
      <ValidatorScores />
    </TokenFamilyPage>
  )
}
