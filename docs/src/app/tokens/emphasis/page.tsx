import { EmphasisGrid } from '@/components/tokens/FamilyVisuals'
import { TokenFamilyPage } from '@/components/tokens/TokenFamilyPage'

import { Code } from '@oztix/roadie-components/code'

export const metadata = {
  title: 'Emphasis and states',
  description:
    'Emphasis presets that set background, text, border and shadow together, and the interaction states that animate them.',
  category: 'Color',
  order: 3
}

export default function EmphasisTokensPage() {
  return (
    <TokenFamilyPage
      family='emphasis'
      intentPicker
      intro={
        <>
          A preset is a whole surface in one class. Add{' '}
          <Code>is-interactive</Code> for hover, press, focus ring and disabled,
          or <Code>is-interactive-field</Code> on a text field.
        </>
      }
    >
      <EmphasisGrid />
    </TokenFamilyPage>
  )
}
