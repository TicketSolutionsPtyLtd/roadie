import { Guideline } from '@/components/Guideline'

import { Code } from '@oztix/roadie-components'

export const metadata = {
  title: 'Shape',
  description:
    'Border-radius scale for consistent, soft corners across all components.'
}

const radiusScale = [
  {
    tier: 'Inline',
    className: 'rounded-sm',
    value: '2px',
    useFor: 'Marks, highlights'
  },
  {
    tier: 'Small',
    className: 'rounded-md',
    value: '6px',
    useFor: 'Inline code, code blocks, prose images'
  },
  {
    tier: 'Field',
    className: 'rounded-lg',
    value: '8px',
    useFor: 'Inputs, textareas, select triggers, radio items'
  },
  {
    tier: 'Container',
    className: 'rounded-xl',
    value: '12px',
    useFor: 'Cards, select popups, radio cards, popovers'
  },
  {
    tier: 'Large',
    className: 'rounded-2xl',
    value: '16px',
    useFor: 'Modals, dialogs, drawers'
  },
  {
    tier: 'Hero',
    className: 'rounded-5xl',
    value: '40px',
    useFor: 'Hero cards, collection headers, bottom sheets'
  },
  {
    tier: 'Feature',
    className: 'rounded-6xl',
    value: '48px',
    useFor: 'Feature banners, spotlight surfaces'
  },
  {
    tier: 'Oversize',
    className: 'rounded-7xl',
    value: '56px',
    useFor: 'Edge-to-edge promotional layouts'
  },
  {
    tier: 'Full',
    className: 'rounded-full',
    value: '9999px',
    useFor: 'Buttons, badges, avatars, pills'
  }
]

const componentMapping = [
  { component: 'Button', tier: 'Full', className: 'rounded-full' },
  { component: 'Badge', tier: 'Full', className: 'rounded-full' },
  { component: 'Card', tier: 'Container', className: 'rounded-xl' },
  { component: 'Select trigger', tier: 'Field', className: 'rounded-lg' },
  { component: 'Select popup', tier: 'Container', className: 'rounded-xl' },
  { component: 'Input', tier: 'Field', className: 'rounded-lg' },
  { component: 'Textarea', tier: 'Field', className: 'rounded-lg' },
  {
    component: 'RadioGroup (default)',
    tier: 'Field',
    className: 'rounded-lg'
  },
  {
    component: 'RadioGroup (card)',
    tier: 'Container',
    className: 'rounded-xl'
  },
  { component: 'Code', tier: 'Small', className: 'rounded-md' },
  { component: 'Mark / Highlight', tier: 'Inline', className: 'rounded-sm' },
  {
    component: 'Prose (code blocks, images)',
    tier: 'Small / Field',
    className: 'rounded-md / rounded-lg'
  }
]

export default function ShapePage() {
  return (
    <div className='grid gap-12'>
      <div className='grid gap-3'>
        <h1 className='text-display-prose-1 text-strong'>Shape</h1>
        <p className='text-lg text-subtle'>
          Soft corners signal approachability. Roadie uses Tailwind&apos;s
          built-in border-radius scale to create a consistent, rounded visual
          language that progresses from inline elements to full containers.
        </p>
      </div>

      {/* Radius scale */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Radius scale</h2>
        <p className='text-subtle'>
          Nine tiers, from inline marks to edge-to-edge hero surfaces.
          Roadie uses Tailwind&apos;s built-in radius utilities up to{' '}
          <Code>rounded-4xl</Code> and adds three extended tiers
          (<Code>rounded-5xl</Code>, <Code>rounded-6xl</Code>,{' '}
          <Code>rounded-7xl</Code>) for large promotional layouts. Avoid
          arbitrary values like <Code>rounded-[2.5rem]</Code> — stick to
          the named utilities so the scale stays consistent.
        </p>

        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-subtle text-left'>
                <th className='py-2 pr-4 font-semibold'>Tier</th>
                <th className='py-2 pr-4 font-semibold'>Class</th>
                <th className='py-2 pr-4 font-semibold'>Value</th>
                <th className='py-2 pr-4 font-semibold'>Use for</th>
                <th className='py-2 font-semibold'>Preview</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-subtler'>
              {radiusScale.map(({ tier, className, value, useFor }) => (
                <tr key={tier}>
                  <td className='py-2 pr-4 text-strong'>{tier}</td>
                  <td className='py-2 pr-4 font-mono text-xs'>{className}</td>
                  <td className='py-2 pr-4 tabular-nums'>{value}</td>
                  <td className='py-2 pr-4 text-subtle'>{useFor}</td>
                  <td className='py-2'>
                    <div
                      className={`${className} size-10 border border-subtle bg-raised`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Visual examples */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Visual examples</h2>
        <p className='text-subtle'>
          Each tier applied to a surface. The progression from subtle to
          dramatic rounding creates a natural visual hierarchy.
        </p>

        <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
          {radiusScale.map(({ tier, className, value }) => (
            <div key={tier} className='grid gap-2'>
              <div
                className={`${className} grid place-content-center border border-subtle bg-raised p-6 ${className === 'rounded-full' ? 'aspect-square max-w-[120px]' : ''}`}
              >
                <p className='font-mono text-sm text-strong'>{className}</p>
                <p className='text-xs text-subtle'>{value}</p>
              </div>
              <p className='text-sm text-strong'>{tier}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Component mapping */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Component usage</h2>
        <p className='text-subtle'>
          Which components use which tier. These are the defaults — override
          with <Code>className</Code> when a specific context requires it.
        </p>

        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-subtle text-left'>
                <th className='py-2 pr-4 font-semibold'>Component</th>
                <th className='py-2 pr-4 font-semibold'>Tier</th>
                <th className='py-2 font-semibold'>Class</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-subtler'>
              {componentMapping.map(({ component, tier, className }) => (
                <tr key={component}>
                  <td className='py-2 pr-4 text-strong'>{component}</td>
                  <td className='py-2 pr-4 text-subtle'>{tier}</td>
                  <td className='py-2 font-mono text-xs'>{className}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Guidelines */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Guidelines</h2>

        <Guideline
          title='Match radius to hierarchy'
          description='Larger radii for higher-level containers, smaller radii for inline or nested elements. This creates a natural visual hierarchy.'
        >
          <Guideline.Do
            example={
              <div className='grid gap-3'>
                <div className='rounded-xl border border-subtle bg-raised p-4'>
                  <p className='mb-2 text-xs text-subtle'>
                    Card — <Code>rounded-xl</Code>
                  </p>
                  <div className='rounded-lg border border-subtle bg-sunken px-3 py-2'>
                    <p className='text-xs text-subtle'>
                      Input — <Code>rounded-lg</Code>
                    </p>
                  </div>
                </div>
              </div>
            }
          >
            Use larger radii for containers (cards, dialogs) and smaller radii
            for inline elements (code, marks).
          </Guideline.Do>
          <Guideline.Dont
            example={
              <div className='grid gap-3'>
                <div className='rounded-md border border-subtle bg-raised p-4'>
                  <p className='mb-2 text-xs text-subtle'>
                    Card — <Code>rounded-md</Code>
                  </p>
                  <div className='rounded-md border border-subtle bg-sunken px-3 py-2'>
                    <p className='text-xs text-subtle'>
                      Input — <Code>rounded-md</Code>
                    </p>
                  </div>
                </div>
              </div>
            }
          >
            Apply the same radius everywhere. A card and an inline code span
            should not share the same corner treatment.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='Keep pills for actions'
          description={
            <>
              Reserve <Code>rounded-full</Code> for interactive pill shapes and
              circular elements.
            </>
          }
        >
          <Guideline.Do
            example={
              <div className='flex flex-wrap items-center gap-2'>
                <span className='emphasis-strong rounded-full px-3 py-1.5 text-sm font-bold'>
                  Button
                </span>
                <span className='emphasis-normal rounded-full px-3 py-1.5 text-sm font-bold text-subtle'>
                  Button
                </span>
                <span className='rounded-full emphasis-subtle px-2.5 py-0.5 text-xs font-semibold'>
                  Badge
                </span>
                <span className='rounded-full emphasis-subtler px-2.5 py-0.5 text-xs font-semibold'>
                  Tag
                </span>
              </div>
            }
          >
            Use rounded-full for buttons, badges, tags, and avatars.
          </Guideline.Do>
          <Guideline.Dont
            example={
              <div className='rounded-full border border-subtle bg-raised p-6'>
                <p className='text-xs text-subtle'>
                  A card with <Code>rounded-full</Code>
                </p>
              </div>
            }
          >
            Use rounded-full on cards or containers. Full rounding distorts
            rectangular layouts.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='Nest with decreasing radius'
          description='When elements are nested, the inner element should use an equal or smaller radius than the outer. This avoids visual tension at corners.'
        >
          <Guideline.Do
            example={
              <div className='rounded-xl border border-subtle bg-raised p-4'>
                <div className='rounded-lg border border-subtle bg-sunken p-3'>
                  <p className='text-xs text-subtle'>
                    Parent <Code>rounded-xl</Code>, child{' '}
                    <Code>rounded-lg</Code>
                  </p>
                </div>
              </div>
            }
          >
            Inner elements use equal or smaller radius than their parent.
          </Guideline.Do>
          <Guideline.Dont
            example={
              <div className='rounded-lg border border-subtle bg-raised p-4'>
                <div className='rounded-2xl border border-subtle bg-sunken p-3'>
                  <p className='text-xs text-subtle'>
                    Parent <Code>rounded-lg</Code>, child{' '}
                    <Code>rounded-2xl</Code>
                  </p>
                </div>
              </div>
            }
          >
            Use a larger radius on a child than its parent — the child&apos;s
            corners will clip awkwardly against the parent&apos;s straighter
            edges.
          </Guideline.Dont>
        </Guideline>
      </section>

      {/* Best practices */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Best practices</h2>
        <ul className='grid list-disc gap-2 pl-5'>
          <li>
            <p>
              <strong>Prefer the standard tier</strong> for each element type.
              Override with <Code>className</Code> only when a specific context
              demands it.
            </p>
          </li>
          <li>
            <p>
              <strong>When in doubt, round up</strong> to the next tier for a
              softer feel. The brand leans soft.
            </p>
          </li>
          <li>
            <p>
              <Code>rounded-2xl</Code> is reserved for{' '}
              <strong>top-layer UI</strong> (modals, dialogs, drawers). Do not
              use it on inline components.
            </p>
          </li>
          <li>
            <p>
              <strong>Never mix custom pixel values</strong> with the Tailwind
              scale. Stick to the utility classes.
            </p>
          </li>
          <li>
            <p>
              <strong>Focus rings follow automatically.</strong> Roadie&apos;s{' '}
              <Code>is-interactive</Code> and <Code>is-interactive-field</Code>{' '}
              utilities handle focus ring radius — no separate token needed.
            </p>
          </li>
        </ul>
      </section>
    </div>
  )
}
