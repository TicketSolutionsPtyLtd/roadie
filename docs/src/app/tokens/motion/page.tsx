import { TokenFamilyPage } from '@/components/tokens/TokenFamilyPage'

export const metadata = {
  title: 'Motion',
  tokenFamily: 'motion',
  description:
    'Durations, easings, keyframes and the ready-made animation and transition classes.',
  category: 'Motion and utilities',
  order: 1
}

export default function MotionTokensPage() {
  return <TokenFamilyPage family='motion' />
}
