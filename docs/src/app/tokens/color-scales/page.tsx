import { ScaleGrid } from '@/components/tokens/FamilyVisuals'
import { TokenFamilyPage } from '@/components/tokens/TokenFamilyPage'

export const metadata = {
  title: 'Color scales',
  tokenFamily: 'color-scales',
  description:
    'Eight OKLCH palettes of 14 steps each, plus the accent parameters, pinned light steps and illustration colours.',
  category: 'Color',
  order: 1
}

export default function ColorScalesTokensPage() {
  return (
    <TokenFamilyPage family='color-scales'>
      <ScaleGrid />
    </TokenFamilyPage>
  )
}
