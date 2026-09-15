import type { ReactNode } from 'react'

import { ArrowRightIcon } from '@phosphor-icons/react/ssr'
import type { TokenFamily } from '@roadie-core/tokens'

import { TOKEN_FAMILY_PAGES } from '@/lib/token-families'
import { getFamilyTokens } from '@/lib/tokens'

import { Button } from '@oztix/roadie-components/button'

import { TokenBrowser } from './TokenBrowser'

/** A token family page: its intro, an optional bespoke visual, then every token in the family. */
export async function TokenFamilyPage({
  family,
  intro,
  intentPicker,
  children
}: {
  family: TokenFamily
  intro: ReactNode
  intentPicker?: boolean
  children?: ReactNode
}) {
  const tokens = await getFamilyTokens(family)
  const { title } = TOKEN_FAMILY_PAGES[family]

  return (
    <div className='@container grid gap-10'>
      <div className='grid gap-3'>
        <p className='text-lg text-subtle [&_code]:whitespace-nowrap'>
          {intro}
        </p>
        <Button
          href={`/tokens/reference?family=${family}`}
          emphasis='subtler'
          size='sm'
        >
          Open in all tokens
          <ArrowRightIcon weight='bold' className='size-4' />
        </Button>
      </div>
      {children}
      <TokenBrowser
        tokens={tokens}
        intentPicker={intentPicker}
        label={`Filter ${title.toLowerCase()}`}
      />
    </div>
  )
}
