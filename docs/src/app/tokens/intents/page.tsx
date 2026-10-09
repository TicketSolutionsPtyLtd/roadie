import { IntentMatrix } from '@/components/tokens/FamilyVisuals'
import { TokenFamilyPage } from '@/components/tokens/TokenFamilyPage'
import { getFamilyTokens } from '@/lib/tokens'

export const metadata = {
  title: 'Intents',
  tokenFamily: 'intents',
  description:
    'The intent classes, the --intent-* roles they set, and the bg-, text- and border- utilities that read them.',
  category: 'Color',
  order: 2
}

export default async function IntentsTokensPage() {
  const roles = await getFamilyTokens('intents')

  return (
    <TokenFamilyPage family='intents' intentPicker>
      <IntentMatrix roles={roles} />
    </TokenFamilyPage>
  )
}
