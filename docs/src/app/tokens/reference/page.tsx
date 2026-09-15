import { TokenBrowser } from '@/components/tokens/TokenBrowser'
import { getTokens } from '@/lib/tokens'

import { Code } from '@oztix/roadie-components/code'

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
    <div className='grid gap-8'>
      <p className='text-lg text-subtle [&_code]:whitespace-nowrap'>
        Generated from the CSS in <Code>@oztix/roadie-core</Code> on every
        build, so it lists exactly what ships. Press{' '}
        <kbd className='rounded-sm border border-subtle px-1 font-mono text-sm'>
          /
        </kbd>{' '}
        to search.
      </p>
      <TokenBrowser tokens={tokens} reference label='Search all tokens' />
    </div>
  )
}
