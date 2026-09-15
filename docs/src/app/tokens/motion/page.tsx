import { TokenFamilyPage } from '@/components/tokens/TokenFamilyPage'

import { Code } from '@oztix/roadie-components/code'

export const metadata = {
  title: 'Motion',
  description:
    'Durations, easings, keyframes and the ready-made animation and transition classes.',
  category: 'Motion and utilities',
  order: 1
}

export default function MotionTokensPage() {
  return (
    <TokenFamilyPage
      family='motion'
      intro={
        <>
          Press a preview to play it. Colour and opacity use the standard
          curves; transforms use <Code>--ease-spring</Code>. Under reduced
          motion every duration drops to near zero.
        </>
      }
    />
  )
}
