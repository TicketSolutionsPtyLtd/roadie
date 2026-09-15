import { IntentMatrix } from '@/components/tokens/FamilyVisuals'
import { TokenFamilyPage } from '@/components/tokens/TokenFamilyPage'

import { Code } from '@oztix/roadie-components/code'

export const metadata = {
  title: 'Intents',
  description:
    'The intent classes, the --intent-* roles they set, and the bg-, text- and border- utilities that read them.',
  category: 'Color',
  order: 2
}

export default function IntentsTokensPage() {
  return (
    <TokenFamilyPage
      family='intents'
      intentPicker
      intro={
        <>
          An <Code>intent-*</Code> class points every <Code>--intent-*</Code>{' '}
          role at one scale, and children inherit it. The semantic utilities
          read those roles, so the same class draws in any intent. Neutral is
          set on <Code>:root</Code>.
        </>
      }
    >
      <IntentMatrix />
    </TokenFamilyPage>
  )
}
