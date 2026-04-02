import { Code } from '@oztix/roadie-components'

export const metadata = {
  title: 'Token reference',
  description: 'Complete reference for all design tokens.'
}

const colorScales = [
  'neutral',
  'brand',
  'brand-secondary',
  'accent',
  'danger',
  'success',
  'warning',
  'info'
] as const

const steps = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const

function ColorScaleVisual({ scale }: { scale: string }) {
  return (
    <div className='grid gap-1'>
      <p className='text-sm text-strong capitalize'>{scale}</p>
      <div className='flex gap-0.5'>
        {steps.map((step) => (
          <div
            key={step}
            className='h-8 flex-1 rounded-sm first:rounded-l-md last:rounded-r-md'
            style={{ backgroundColor: `var(--color-${scale}-${step})` }}
            title={`--color-${scale}-${step}`}
          />
        ))}
      </div>
      <div className='flex gap-0.5'>
        {steps.map((step) => (
          <p key={step} className='flex-1 text-center text-xs text-subtler'>
            {step}
          </p>
        ))}
      </div>
    </div>
  )
}

function TokenTable({
  title,
  tokens
}: {
  title: string
  tokens: { name: string; step: string; usage: string }[]
}) {
  return (
    <div className='grid gap-2'>
      <p className='text-sm text-strong'>{title}</p>
      <div className='overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-subtle'>
              <th className='py-1.5 pr-4 text-left font-medium'>Token</th>
              <th className='py-1.5 pr-4 text-left font-medium'>Step</th>
              <th className='py-1.5 text-left font-medium'>Usage</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-subtler text-subtle'>
            {tokens.map((t) => (
              <tr key={t.name}>
                <td className='py-1.5 pr-4'>
                  <Code>{t.name}</Code>
                </td>
                <td className='py-1.5 pr-4'>{t.step}</td>
                <td className='py-1.5'>{t.usage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function TokenReferencePage() {
  return (
    <div className='grid gap-12'>
      <div className='grid gap-3'>
        <h1 className='text-display-prose-1 text-strong'>Token reference</h1>
        <p className='text-lg text-subtle'>
          Complete reference for the v2 design token system. All tokens are CSS
          custom properties defined via Tailwind v4&apos;s @theme directive.
        </p>
      </div>

      {/* Color Scales */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Color scales</h2>
        <p className='text-subtle'>
          Each scale provides 14 OKLCH steps (0-13). Step 0 is the lightest
          extreme, step 13 the darkest. Dark mode swaps the underlying values —
          step numbers stay the same.
        </p>
        <div className='grid gap-4'>
          {colorScales.map((scale) => (
            <ColorScaleVisual key={scale} scale={scale} />
          ))}
        </div>
      </section>

      {/* Intent semantic tokens */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>
          Intent semantic tokens
        </h2>
        <p className='text-subtle'>
          Set by intent utilities (e.g. <Code>intent-accent</Code>). Each intent
          maps scale steps to semantic roles.
        </p>

        <TokenTable
          title='Surface'
          tokens={[
            {
              name: '--intent-surface-default',
              step: '1',
              usage: 'Page/canvas background'
            },
            {
              name: '--intent-surface-subtler',
              step: '2',
              usage: 'Barely tinted background'
            },
            {
              name: '--intent-surface-subtle',
              step: '3',
              usage: 'Noticeable tint, button hover bg'
            },
            {
              name: '--intent-surface-strong',
              step: '9 (neutral: 12)',
              usage: 'Solid color, primary buttons'
            },
            {
              name: '--intent-surface-inverted',
              step: '12',
              usage: 'Inverted surface'
            },
            {
              name: '--intent-surface-raised',
              step: '0 (dark: 2)',
              usage: 'Elevated card with shadow'
            },
            {
              name: '--intent-surface-sunken',
              step: '2 (dark: 0)',
              usage: 'Inset area with shadow'
            }
          ]}
        />

        <TokenTable
          title='Border'
          tokens={[
            {
              name: '--intent-border-subtler',
              step: '5',
              usage: 'Card edges, very faint'
            },
            {
              name: '--intent-border-subtle',
              step: '6',
              usage: 'Dividers, hr'
            },
            {
              name: '--intent-border-default',
              step: '7',
              usage: 'Standard borders'
            },
            {
              name: '--intent-border-strong',
              step: '9',
              usage: 'Bold borders'
            },
            {
              name: '--intent-border-inverted',
              step: '12',
              usage: 'Inverted borders'
            }
          ]}
        />

        <TokenTable
          title='Foreground'
          tokens={[
            {
              name: '--intent-fg-subtler',
              step: '10',
              usage: 'Placeholder, hint text'
            },
            {
              name: '--intent-fg-subtle',
              step: '11',
              usage: 'Secondary text, button text'
            },
            {
              name: '--intent-fg-default',
              step: '12',
              usage: 'Body text'
            },
            {
              name: '--intent-fg-strong',
              step: '13',
              usage: 'Bold headings'
            },
            {
              name: '--intent-fg-inverted',
              step: '0',
              usage: 'White/black text on strong surfaces'
            }
          ]}
        />

        <TokenTable
          title='Raw steps'
          tokens={[
            {
              name: '--intent-0 … --intent-13',
              step: '0–13',
              usage: 'Direct access to any scale step for hover/active states'
            }
          ]}
        />
      </section>

      {/* Typography */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Typography</h2>

        <TokenTable
          title='Font sizes (fluid from lg)'
          tokens={[
            { name: '--text-xs', step: '0.75rem', usage: '12px' },
            { name: '--text-sm', step: '0.875rem', usage: '14px' },
            { name: '--text-base', step: '1rem', usage: '16px' },
            {
              name: '--text-lg',
              step: 'clamp(1.125rem…1.25rem)',
              usage: '18–20px fluid'
            },
            {
              name: '--text-xl',
              step: 'clamp(1.25rem…1.5rem)',
              usage: '20–24px fluid'
            },
            {
              name: '--text-2xl',
              step: 'clamp(1.5rem…2rem)',
              usage: '24–32px fluid'
            },
            {
              name: '--text-3xl',
              step: 'clamp(1.75rem…2.5rem)',
              usage: '28–40px fluid'
            },
            {
              name: '--text-4xl',
              step: 'clamp(2rem…3rem)',
              usage: '32–48px fluid'
            },
            {
              name: '--text-5xl',
              step: 'clamp(2.25rem…4rem)',
              usage: '36–64px fluid'
            }
          ]}
        />

        <TokenTable
          title='Semantic line heights'
          tokens={[
            { name: '--leading-display', step: '1.2', usage: 'Headings' },
            { name: '--leading-ui', step: '1.35', usage: 'App interface' },
            { name: '--leading-prose', step: '1.5', usage: 'Long-form' },
            { name: '--leading-code', step: '1.625', usage: 'Code blocks' }
          ]}
        />

        <TokenTable
          title='Semantic letter spacing'
          tokens={[
            {
              name: '--tracking-display',
              step: '-0.02em',
              usage: 'Headings'
            },
            { name: '--tracking-ui', step: '-0.01em', usage: 'App interface' },
            {
              name: '--tracking-prose',
              step: '-0.01em',
              usage: 'Long-form'
            },
            { name: '--tracking-code', step: '0em', usage: 'Code blocks' }
          ]}
        />
      </section>

      {/* Elevation */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Elevation</h2>
        <TokenTable
          title='Box shadows'
          tokens={[
            {
              name: '--elevation-raised',
              step: 'drop shadow',
              usage: 'Cards, floating elements'
            },
            {
              name: '--elevation-sunken',
              step: 'inset shadow',
              usage: 'Recessed areas, inputs'
            },
            {
              name: '--elevation-overlay',
              step: 'large shadow',
              usage: 'Modals, popovers'
            }
          ]}
        />
      </section>

      {/* Source */}
      <div className='rounded-xl border border-default p-6'>
        <p className='text-subtle'>
          All tokens are defined in{' '}
          <Code>packages/core/src/css/tokens.css</Code>. Intent mappings are in{' '}
          <Code>intents.css</Code>. Emphasis utilities are in{' '}
          <Code>emphasis.css</Code>.
        </p>
      </div>
    </div>
  )
}
