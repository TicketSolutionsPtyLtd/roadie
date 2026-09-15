import Link from 'next/link'

import { ArrowRightIcon } from '@phosphor-icons/react/ssr'

import { Guideline } from '@/components/Guideline'
import { PreviewCard, PreviewSection } from '@/components/PreviewGrid'
import { LayerStack } from '@/components/tokens/LayerStack'
import { TokenFamilyArt } from '@/components/tokens/TokenFamilyArt'
import { TokenSearchForm } from '@/components/tokens/TokenSearchForm'
import { TOKEN_FAMILY_ORDER, TOKEN_FAMILY_PAGES } from '@/lib/token-families'
import { getTokens } from '@/lib/tokens'

import { Button } from '@oztix/roadie-components/button'
import { Code } from '@oztix/roadie-components/code'

export const metadata = {
  title: 'Tokens',
  description:
    'Every value Roadie ships, as CSS variables and Tailwind classes. Learn the five layers, then search for the one you need.'
}

export default async function TokensPage() {
  const tokens = await getTokens()
  const count = (family: string) =>
    tokens.filter((token) => token.family === family).length

  return (
    <div className='@container grid gap-12'>
      <div className='grid gap-4'>
        <p className='text-lg text-subtle'>{metadata.description}</p>
        <TokenSearchForm count={tokens.length} />
      </div>

      <LayerStack />

      <PreviewSection
        title='Families'
        action={
          <Button href='/tokens/reference' emphasis='subtler' size='sm'>
            All tokens
            <ArrowRightIcon weight='bold' className='size-4' />
          </Button>
        }
      >
        {TOKEN_FAMILY_ORDER.map((family) => (
          <PreviewCard
            key={family}
            href={TOKEN_FAMILY_PAGES[family].href}
            title={TOKEN_FAMILY_PAGES[family].title}
            subtitle={`${count(family)} tokens`}
          >
            <TokenFamilyArt family={family} />
          </PreviewCard>
        ))}
      </PreviewSection>

      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>
          Reach for the highest layer
        </h2>
        <Guideline
          title='Colour a component with intent and emphasis'
          description='Presets carry hover, press and dark mode with them. Raw steps carry nothing.'
        >
          <Guideline.Do
            code={`<div className='intent-danger emphasis-subtle'>`}
          >
            <p>Set the intent, then pick an emphasis.</p>
          </Guideline.Do>
          <Guideline.Dont code={`<div className='bg-danger-3 text-danger-11'>`}>
            <p>Hand-pick scale steps for a surface.</p>
          </Guideline.Dont>
        </Guideline>
        <Guideline
          title='Read the role, not the step'
          description='Components inherit the intent around them, so the role resolves to the right scale.'
        >
          <Guideline.Do code={`color: var(--intent-text-subtle);`}>
            <p>
              Use an <Code>--intent-*</Code> role in custom CSS.
            </p>
          </Guideline.Do>
          <Guideline.Dont code={`color: var(--color-neutral-11);`}>
            <p>
              Pin a <Code>--color-*</Code> step inside a component.
            </p>
          </Guideline.Dont>
        </Guideline>
      </section>

      <section className='grid gap-3'>
        <h2 className='text-display-ui-3 text-strong'>Dark mode and theming</h2>
        <p className='text-subtle'>
          The <Code>.dark</Code> class on <Code>&lt;html&gt;</Code> swaps every
          scale&apos;s values, so no <Code>dark:</Code> variants are needed. The
          accent scale follows <Code>--accent-hue</Code> and{' '}
          <Code>--accent-chroma</Code>, which <Code>ThemeProvider</Code> sets at
          runtime.{' '}
          <Link
            href='/foundations/theming'
            className='font-medium text-strong underline underline-offset-4'
          >
            Theming
          </Link>{' '}
          covers both.
        </p>
      </section>
    </div>
  )
}
