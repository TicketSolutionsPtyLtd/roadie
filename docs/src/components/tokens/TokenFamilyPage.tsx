import { Fragment, type ReactNode } from 'react'

import Link from 'next/link'

import { ArrowRightIcon } from '@phosphor-icons/react/ssr'
import type { TokenFamily } from '@roadie-core/tokens'

import { TOKEN_FAMILY_PAGES } from '@/lib/token-families'
import { getFamilyTokens } from '@/lib/tokens'

import { Code } from '@oztix/roadie-components/code'

import { TokenBrowser } from './TokenBrowser'

/** Text with `inline code` in backticks, as the family intros are written. */
function TextWithCode({ text }: { text: string }) {
  return text
    .split('`')
    .map((part, index) => (
      <Fragment key={index}>
        {index % 2 === 1 ? <Code>{part}</Code> : part}
      </Fragment>
    ))
}

/** A token family page: its intro, an optional bespoke visual, then every token in the family. */
export async function TokenFamilyPage({
  family,
  intentPicker,
  children
}: {
  family: TokenFamily
  intentPicker?: boolean
  children?: ReactNode
}) {
  const tokens = await getFamilyTokens(family)
  const { title, intro } = TOKEN_FAMILY_PAGES[family]

  return (
    <div className='@container grid gap-8'>
      <div className='grid gap-2'>
        <p className='text-lg text-subtle [&_code]:whitespace-nowrap'>
          <TextWithCode text={intro} />
        </p>
        <Link
          href={`/tokens/reference?family=${family}`}
          className='inline-flex items-center gap-1 justify-self-start text-sm font-medium text-strong underline-offset-4 hover:underline'
        >
          Open in all tokens
          <ArrowRightIcon weight='bold' className='size-3' />
        </Link>
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
