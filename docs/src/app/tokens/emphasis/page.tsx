import { EmphasisGrid } from '@/components/tokens/FamilyVisuals'
import { TokenFamilyPage } from '@/components/tokens/TokenFamilyPage'

export const metadata = {
  title: 'Emphasis and states',
  tokenFamily: 'emphasis',
  description:
    'Emphasis presets that set background, text, border and shadow together, and the interaction states that animate them.',
  category: 'Color',
  order: 3
}

export default function EmphasisTokensPage() {
  return (
    <TokenFamilyPage family='emphasis' intentPicker>
      <EmphasisGrid />
    </TokenFamilyPage>
  )
}
