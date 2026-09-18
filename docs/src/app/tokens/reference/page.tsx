import { TokenBrowser } from '@/components/tokens/TokenBrowser'
import { getTokens } from '@/lib/tokens'

export const metadata = {
  title: 'All tokens',
  description:
    'Search every variable, class, variant and keyframe Roadie core ships. Copy the variable or the class.',
  category: 'Reference',
  order: 0
}

export default async function TokenReferencePage() {
  const tokens = await getTokens()

  return (
    <div className='grid gap-6'>
      <p className='text-lg text-subtle'>
        Every variable, class, variant and keyframe core ships, generated from
        its CSS on every build. Press / to search from anywhere on the page.
      </p>
      <TokenBrowser tokens={tokens} reference label='Search all tokens' />
    </div>
  )
}
