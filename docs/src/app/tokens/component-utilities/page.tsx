import { TokenFamilyPage } from '@/components/tokens/TokenFamilyPage'

export const metadata = {
  title: 'Component utilities',
  tokenFamily: 'component-utilities',
  description:
    'Button and calendar tile classes for templates without React, and the navigator-expanded variant.',
  category: 'Motion and utilities',
  order: 2
}

export default function ComponentUtilitiesTokensPage() {
  return <TokenFamilyPage family='component-utilities' />
}
