import { Code, Heading, Text } from '@oztix/roadie-components'

export const metadata = {
  title: 'Spacing',
  description:
    'Tailwind spacing scale with visual reference for consistent layouts.'
}

const spacingScale = [
  { token: '0', value: '0px', rem: '0rem' },
  { token: '0.5', value: '2px', rem: '0.125rem' },
  { token: '1', value: '4px', rem: '0.25rem' },
  { token: '1.5', value: '6px', rem: '0.375rem' },
  { token: '2', value: '8px', rem: '0.5rem' },
  { token: '3', value: '12px', rem: '0.75rem' },
  { token: '4', value: '16px', rem: '1rem' },
  { token: '5', value: '20px', rem: '1.25rem' },
  { token: '6', value: '24px', rem: '1.5rem' },
  { token: '8', value: '32px', rem: '2rem' },
  { token: '10', value: '40px', rem: '2.5rem' },
  { token: '12', value: '48px', rem: '3rem' },
  { token: '16', value: '64px', rem: '4rem' },
  { token: '20', value: '80px', rem: '5rem' },
  { token: '24', value: '96px', rem: '6rem' }
]

export default function SpacingPage() {
  return (
    <div className='view gap-10'>
      <div className='view gap-3'>
        <Heading as='h1' className='text-display-prose-1'>
          Spacing
        </Heading>
        <Text size='lg' emphasis='subtle'>
          Roadie v2 uses Tailwind CSS v4&apos;s built-in spacing scale. Use
          utility classes like <Code>p-4</Code>, <Code>gap-2</Code>,{' '}
          <Code>mt-8</Code> for consistent spacing.
        </Text>
      </div>

      {/* Visual spacing scale */}
      <section className='view gap-4'>
        <Heading as='h2' className='text-display-ui-3'>
          Spacing scale
        </Heading>
        <Text emphasis='subtle'>
          Based on a 4px unit. Use the token number with any spacing utility (
          <Code>p-</Code>, <Code>m-</Code>, <Code>gap-</Code>, <Code>w-</Code>,{' '}
          <Code>h-</Code>, etc.).
        </Text>

        <div className='view gap-1 emphasis-subtle-surface emphasis-subtle-border rounded-lg p-4 overflow-x-auto'>
          {spacingScale.map(({ token, value, rem }) => (
            <div key={token} className='flex items-center gap-3'>
              <Text
                size='sm'
                emphasis='strong'
                className='w-10 shrink-0 text-right tabular-nums'
              >
                {token}
              </Text>
              <div
                className='h-6 rounded-sm bg-brand-9 shrink-0'
                style={{ width: rem }}
              />
              <Text size='xs' emphasis='subtler' className='shrink-0'>
                {value}
              </Text>
            </div>
          ))}
        </div>
      </section>

      {/* Usage */}
      <section className='view gap-4'>
        <Heading as='h2' className='text-display-ui-3'>
          Usage
        </Heading>

        <div className='view gap-6'>
          <div className='view gap-2'>
            <Heading as='h3' className='text-display-ui-5'>
              Padding and gap
            </Heading>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='border-b border-neutral-7'>
                    <th className='py-2 pr-4 text-left font-semibold'>
                      Utility
                    </th>
                    <th className='py-2 pr-4 text-left font-semibold'>
                      Description
                    </th>
                    <th className='py-2 text-left font-semibold'>Example</th>
                  </tr>
                </thead>
                <tbody className='emphasis-subtle-fg'>
                  <tr className='border-b border-neutral-6'>
                    <td className='py-2 pr-4'>
                      <Code>p-4</Code>
                    </td>
                    <td className='py-2 pr-4'>16px padding all sides</td>
                    <td className='py-2'>
                      <Code>className=&quot;p-4&quot;</Code>
                    </td>
                  </tr>
                  <tr className='border-b border-neutral-6'>
                    <td className='py-2 pr-4'>
                      <Code>px-6 py-2</Code>
                    </td>
                    <td className='py-2 pr-4'>24px horizontal, 8px vertical</td>
                    <td className='py-2'>
                      <Code>className=&quot;px-6 py-2&quot;</Code>
                    </td>
                  </tr>
                  <tr className='border-b border-neutral-6'>
                    <td className='py-2 pr-4'>
                      <Code>gap-4</Code>
                    </td>
                    <td className='py-2 pr-4'>16px gap in flex/grid</td>
                    <td className='py-2'>
                      <Code>className=&quot;flex gap-4&quot;</Code>
                    </td>
                  </tr>
                  <tr className='border-b border-neutral-6'>
                    <td className='py-2 pr-4'>
                      <Code>gap-x-8 gap-y-4</Code>
                    </td>
                    <td className='py-2 pr-4'>32px column gap, 16px row gap</td>
                    <td className='py-2'>
                      <Code>className=&quot;grid gap-x-8 gap-y-4&quot;</Code>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className='view gap-2'>
            <Heading as='h3' className='text-display-ui-5'>
              Responsive spacing
            </Heading>
            <Text emphasis='subtle'>
              Use breakpoint prefixes to adjust spacing at different screen
              sizes. Always start mobile-first.
            </Text>
            <div className='emphasis-subtle-surface emphasis-subtle-border rounded-lg p-4'>
              <Code>
                className=&quot;mt-2 md:mt-4 lg:mt-8 px-4 md:px-6&quot;
              </Code>
            </div>
          </div>
        </div>
      </section>

      {/* Best practices */}
      <section className='view gap-4'>
        <Heading as='h2' className='text-display-ui-3'>
          Best practices
        </Heading>
        <ol className='view gap-3 list-decimal pl-6'>
          <li>
            <Text as='span'>
              <strong>Use the scale, not magic numbers</strong> —{' '}
              <Code>p-4</Code> not <Code>p-[17px]</Code>
            </Text>
          </li>
          <li>
            <Text as='span'>
              <strong>Prefer gap over margins</strong> — cleaner, no collapsing
              issues
            </Text>
          </li>
          <li>
            <Text as='span'>
              <strong>Start mobile-first</strong> — use responsive prefixes (
              <Code>md:</Code>, <Code>lg:</Code>) to scale up
            </Text>
          </li>
          <li>
            <Text as='span'>
              <strong>Consistent patterns</strong> — small gaps (1-2) for
              related elements, medium (4-6) for components, large (8+) for
              sections
            </Text>
          </li>
        </ol>
      </section>
    </div>
  )
}
