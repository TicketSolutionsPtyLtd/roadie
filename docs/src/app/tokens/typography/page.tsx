import { TokenFamilyPage } from '@/components/tokens/TokenFamilyPage'

import { Code } from '@oztix/roadie-components/code'

export const metadata = {
  title: 'Typography',
  description:
    'Font families, the fluid size scale, line heights, letter spacing and the composed text styles.',
  category: 'Type, shape and depth',
  order: 1
}

export default function TypographyTokensPage() {
  return (
    <TokenFamilyPage
      family='typography'
      intro={
        <>
          Sizes from <Code>text-lg</Code> up are fluid. A size class sets no
          line height, so pair it with <Code>leading-*</Code> or use a composed{' '}
          <Code>text-display-*</Code> or <Code>text-ui</Code> style.
        </>
      }
    />
  )
}
