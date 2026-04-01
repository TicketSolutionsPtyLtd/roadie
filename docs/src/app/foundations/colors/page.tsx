import { Heading, Text } from '@oztix/roadie-components'

export const metadata = {
  title: 'Colors',
  description:
    'OKLCH color system with intent-based semantic tokens for consistent theming.'
}

const intents = [
  'neutral',
  'brand',
  'accent',
  'danger',
  'success',
  'warning',
  'info'
] as const
const steps = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const

function ColorScale({ intent }: { intent: string }) {
  return (
    <div className='flex flex-col gap-1'>
      <Text size='sm' emphasis='strong' className='capitalize'>
        {intent}
      </Text>
      <div className='flex gap-0.5'>
        {steps.map((step) => (
          <div
            key={step}
            className='h-10 flex-1 rounded-sm first:rounded-l-md last:rounded-r-md'
            style={{ backgroundColor: `var(--color-${intent}-${step})` }}
            title={`${intent}-${step}`}
          />
        ))}
      </div>
      <div className='flex gap-0.5'>
        {steps.map((step) => (
          <Text
            key={step}
            size='xs'
            emphasis='subtler'
            className='flex-1 text-center'
          >
            {step}
          </Text>
        ))}
      </div>
    </div>
  )
}

function EmphasisDemo({ intent }: { intent: string }) {
  return (
    <div className={`intent-${intent} flex flex-col gap-2`}>
      <div className='flex gap-2'>
        <div className='emphasis-strong rounded-md px-3 py-1.5 text-sm'>
          strong
        </div>
        <div className='emphasis-subtle rounded-md px-3 py-1.5 text-sm emphasis-default-fg'>
          subtle
        </div>
        <div className='emphasis-subtler rounded-md px-3 py-1.5 text-sm emphasis-default-fg'>
          subtler
        </div>
        <div className='emphasis-default-surface emphasis-default-border emphasis-default-fg rounded-md px-3 py-1.5 text-sm'>
          default + border
        </div>
      </div>
    </div>
  )
}

export default function ColorsPage() {
  return (
    <div className='flex flex-col gap-12'>
      <div className='flex flex-col gap-3'>
        <Heading as='h1' className='text-display-prose-1'>
          Colors
        </Heading>
        <Text size='lg' emphasis='subtle'>
          Roadie uses OKLCH color scales with 14 steps (0–13) per intent,
          providing perceptually uniform colors across all hues in both light
          and dark modes.
        </Text>
      </div>

      {/* Color scales */}
      <section className='flex flex-col gap-6'>
        <Heading as='h2' className='text-display-ui-3'>
          Color scales
        </Heading>
        <Text emphasis='subtle'>
          Each intent has a 14-step scale. Steps 1–12 follow the Radix color
          system. Step 0 is the lightest extreme, step 13 the darkest.
        </Text>
        <div className='flex flex-col gap-6'>
          {intents.map((intent) => (
            <ColorScale key={intent} intent={intent} />
          ))}
        </div>
      </section>

      {/* Semantic mapping */}
      <section className='flex flex-col gap-6'>
        <Heading as='h2' className='text-display-ui-3'>
          Semantic mapping
        </Heading>
        <Text emphasis='subtle'>
          Colors are accessed through the emphasis system, not by step number
          directly. The emphasis scale maps to specific steps:
        </Text>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-emphasis-subtle'>
                <th className='text-left py-2 pr-4 font-semibold'>Level</th>
                <th className='text-left py-2 pr-4 font-semibold'>Surface</th>
                <th className='text-left py-2 pr-4 font-semibold'>Border</th>
                <th className='text-left py-2 font-semibold'>Foreground</th>
              </tr>
            </thead>
            <tbody className='emphasis-subtle-fg divide-y divide-emphasis-subtler'>
              <tr>
                <td className='py-2 pr-4'>subtler</td>
                <td className='py-2 pr-4'>step 2</td>
                <td className='py-2 pr-4'>step 5</td>
                <td className='py-2'>step 10</td>
              </tr>
              <tr>
                <td className='py-2 pr-4'>subtle</td>
                <td className='py-2 pr-4'>step 3</td>
                <td className='py-2 pr-4'>step 6</td>
                <td className='py-2'>step 11</td>
              </tr>
              <tr>
                <td className='py-2 pr-4'>default</td>
                <td className='py-2 pr-4'>step 1</td>
                <td className='py-2 pr-4'>step 7</td>
                <td className='py-2'>step 12</td>
              </tr>
              <tr>
                <td className='py-2 pr-4'>strong</td>
                <td className='py-2 pr-4'>step 9</td>
                <td className='py-2 pr-4'>step 9</td>
                <td className='py-2'>step 13 + bold</td>
              </tr>
              <tr>
                <td className='py-2 pr-4'>inverted</td>
                <td className='py-2 pr-4'>step 12</td>
                <td className='py-2 pr-4'>step 12</td>
                <td className='py-2'>step 0</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Intent + emphasis demo */}
      <section className='flex flex-col gap-6'>
        <Heading as='h2' className='text-display-ui-3'>
          Intent + emphasis
        </Heading>
        <Text emphasis='subtle'>
          Each intent works with the emphasis scale. Use{' '}
          <code className='font-mono text-sm emphasis-subtler-surface px-1 py-0.5 rounded'>
            intent-&#123;name&#125;
          </code>{' '}
          to set the color context, then{' '}
          <code className='font-mono text-sm emphasis-subtler-surface px-1 py-0.5 rounded'>
            emphasis-&#123;level&#125;
          </code>{' '}
          for the visual weight.
        </Text>
        <div className='flex flex-col gap-4'>
          {intents.map((intent) => (
            <div key={intent} className='flex flex-col gap-1'>
              <Text size='sm' emphasis='strong' className='capitalize'>
                {intent}
              </Text>
              <EmphasisDemo intent={intent} />
            </div>
          ))}
        </div>
      </section>

      {/* Dark mode */}
      <section className='flex flex-col gap-4'>
        <Heading as='h2' className='text-display-ui-3'>
          Dark mode
        </Heading>
        <Text emphasis='subtle'>
          Dark mode is automatic. The{' '}
          <code className='font-mono text-sm emphasis-subtler-surface px-1 py-0.5 rounded'>
            .dark
          </code>{' '}
          class on{' '}
          <code className='font-mono text-sm emphasis-subtler-surface px-1 py-0.5 rounded'>
            &lt;html&gt;
          </code>{' '}
          swaps all OKLCH values. No{' '}
          <code className='font-mono text-sm emphasis-subtler-surface px-1 py-0.5 rounded'>
            dark:
          </code>{' '}
          Tailwind variants needed for colors.
        </Text>
      </section>

      {/* Dynamic accent */}
      <section className='flex flex-col gap-4'>
        <Heading as='h2' className='text-display-ui-3'>
          Dynamic accent color
        </Heading>
        <Text emphasis='subtle'>
          The accent scale can be overridden at runtime using the{' '}
          <code className='font-mono text-sm emphasis-subtler-surface px-1 py-0.5 rounded'>
            ThemeProvider
          </code>{' '}
          component or{' '}
          <code className='font-mono text-sm emphasis-subtler-surface px-1 py-0.5 rounded'>
            generateAccentScale()
          </code>{' '}
          function. Pass any hex color and the system generates a full 14-step
          OKLCH scale with automatic WCAG contrast detection.
        </Text>
      </section>
    </div>
  )
}
