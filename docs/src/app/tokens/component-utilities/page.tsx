import { TokenFamilyPage } from '@/components/tokens/TokenFamilyPage'

import { Code } from '@oztix/roadie-components/code'

export const metadata = {
  title: 'Component utilities',
  description:
    'Button and calendar tile classes for templates without React, and the navigator-expanded variant.',
  category: 'Motion and utilities',
  order: 2
}

export default function ComponentUtilitiesTokensPage() {
  return (
    <TokenFamilyPage
      family='component-utilities'
      intro={
        <>
          The same styles the React components apply, for server-rendered and
          Vue templates. Pair <Code>btn</Code> with a size, an intent and an
          emphasis.
        </>
      }
    />
  )
}
