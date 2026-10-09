import { TokenFamilyPage } from '@/components/tokens/TokenFamilyPage'

export const metadata = {
  title: 'Typography',
  tokenFamily: 'typography',
  description:
    'Font families, the fluid size scale, line heights, letter spacing and the composed text styles.',
  category: 'Type, shape and depth',
  order: 1
}

export default function TypographyTokensPage() {
  return <TokenFamilyPage family='typography' />
}
