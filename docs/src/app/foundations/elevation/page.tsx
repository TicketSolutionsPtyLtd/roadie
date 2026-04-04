import { Code } from '@oztix/roadie-components'

export const metadata = {
  title: 'Elevation',
  description:
    'Intent-tinted shadow scale for depth and hierarchy in light and dark modes.'
}

const shadowScale = [
  {
    name: 'shadow-xs',
    description: 'Subtle depth for small elements like badges, chips',
    className: 'shadow-xs'
  },
  {
    name: 'shadow-sm',
    description: 'Light depth for buttons, inputs, minor cards',
    className: 'shadow-sm'
  },
  {
    name: 'shadow-md',
    description: 'Default raised surface — cards, panels',
    className: 'shadow-md'
  },
  {
    name: 'shadow-lg',
    description: 'Prominent depth — hover states, featured cards',
    className: 'shadow-lg'
  },
  {
    name: 'shadow-xl',
    description: 'High emphasis — dropdowns, popovers, floating panels',
    className: 'shadow-xl'
  },
  {
    name: 'shadow-2xl',
    description: 'Maximum depth — modals, dialogs, overlays',
    className: 'shadow-2xl'
  }
]

const insetScale = [
  {
    name: 'inset-shadow-xs',
    description: 'Subtle inner depth for pressed states',
    className: 'inset-shadow-xs'
  },
  {
    name: 'inset-shadow-sm',
    description: 'Sunken surfaces — input fields, wells',
    className: 'inset-shadow-sm'
  }
]

const emphasisPresets = [
  {
    name: 'emphasis-raised',
    description:
      'Raised card surface with rim light, shadow-md at rest. Lifts on hover, presses on active.',
    className: 'emphasis-raised',
    interactive: true
  },
  {
    name: 'emphasis-sunken',
    description:
      'Recessed surface with inset shadow. Used for input wells and sunken panels.',
    className: 'emphasis-sunken',
    interactive: false
  },
  {
    name: 'emphasis-floating',
    description:
      'High-elevation floating surface with rim light and shadow-xl. For popovers and dropdowns.',
    className: 'emphasis-floating',
    interactive: false
  }
]

const intents = [
  { name: 'neutral', className: 'intent-neutral' },
  { name: 'brand', className: 'intent-brand' },
  { name: 'accent', className: 'intent-accent' },
  { name: 'danger', className: 'intent-danger' },
  { name: 'success', className: 'intent-success' },
  { name: 'warning', className: 'intent-warning' },
  { name: 'info', className: 'intent-info' }
]

export default function ElevationPage() {
  return (
    <div className='grid gap-10'>
      <div className='grid gap-3'>
        <h1 className='text-display-prose-1 text-strong'>Elevation</h1>
        <p className='text-lg text-subtle'>
          Shadows are tinted with the current intent&apos;s hue using CSS-native{' '}
          <Code>oklch()</Code>. A card inside <Code>intent-danger</Code>{' '}
          automatically gets red-tinted shadows. Uses Tailwind&apos;s standard
          shadow utilities.
        </p>
      </div>

      {/* Shadow scale */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Shadow scale</h2>
        <p className='text-subtle'>
          Each level uses multi-layer shadows with geometric scaling. Apply with{' '}
          <Code>shadow-sm</Code>, <Code>shadow-lg</Code>, etc.
        </p>

        <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
          {shadowScale.map(({ name, description, className }) => (
            <div key={name} className='grid gap-2'>
              <div className={`${className} rounded-xl bg-raised p-6`}>
                <p className='font-mono text-sm text-strong'>{name}</p>
              </div>
              <p className='text-sm text-subtle'>{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Inset shadows */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Inset shadows</h2>
        <p className='text-subtle'>
          For sunken surfaces like input fields and wells. Apply with{' '}
          <Code>inset-shadow-xs</Code> or <Code>inset-shadow-sm</Code>.
        </p>

        <div className='grid gap-6 sm:grid-cols-2'>
          {insetScale.map(({ name, description, className }) => (
            <div key={name} className='grid gap-2'>
              <div className={`${className} rounded-xl bg-normal p-6`}>
                <p className='font-mono text-sm text-strong'>{name}</p>
              </div>
              <p className='text-sm text-subtle'>{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Rim light */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Rim light</h2>
        <p className='text-subtle'>
          A subtle inner highlight for raised surfaces. Adds a polished,
          glass-like edge. Four levels available, used automatically by emphasis
          presets.
        </p>

        <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-4'>
          {[
            {
              name: 'rim-light-subtler',
              desc: 'Barely visible — subtle surfaces'
            },
            { name: 'rim-light-subtle', desc: 'Gentle — strong buttons' },
            { name: 'rim-light-normal', desc: 'Standard — rim-light utility' },
            {
              name: 'rim-light-strong',
              desc: 'Prominent — raised/floating surfaces'
            }
          ].map(({ name, desc }) => (
            <div key={name} className='grid gap-2'>
              <div
                className='rounded-xl bg-raised p-6 shadow-md'
                style={{ boxShadow: `var(--${name}), var(--shadow-md)` }}
              >
                <p className='font-mono text-xs text-strong'>{name}</p>
              </div>
              <p className='text-xs text-subtle'>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Emphasis presets */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Emphasis presets</h2>
        <p className='text-subtle'>
          The emphasis system includes elevation-aware presets that combine
          background, shadow, and interactive states. These are the recommended
          way to apply elevation.
        </p>

        <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
          {emphasisPresets.map(
            ({ name, description, className, interactive }) => (
              <div key={name} className='grid gap-2'>
                <div
                  className={`${className} ${interactive ? 'is-interactive' : ''} rounded-xl p-6`}
                >
                  <p className='font-mono text-sm text-strong'>{name}</p>
                  {interactive && (
                    <p className='mt-1 text-xs text-subtle'>
                      Hover and click me
                    </p>
                  )}
                </div>
                <p className='text-sm text-subtle'>{description}</p>
              </div>
            )
          )}
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-subtle text-left'>
                <th className='py-2 pr-4 font-semibold'>Preset</th>
                <th className='py-2 pr-4 font-semibold'>Shadow</th>
                <th className='py-2 pr-4 font-semibold'>Hover</th>
                <th className='py-2 font-semibold'>Active</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-subtler'>
              <tr>
                <td className='py-2 pr-4 font-mono'>emphasis-raised</td>
                <td className='py-2 pr-4'>rim-light-strong + shadow-md</td>
                <td className='py-2 pr-4'>rim-light-strong + shadow-lg</td>
                <td className='py-2'>rim-light-strong + shadow-sm</td>
              </tr>
              <tr>
                <td className='py-2 pr-4 font-mono'>emphasis-sunken</td>
                <td className='py-2 pr-4'>inset-shadow-sm</td>
                <td className='py-2 pr-4'>—</td>
                <td className='py-2'>—</td>
              </tr>
              <tr>
                <td className='py-2 pr-4 font-mono'>emphasis-floating</td>
                <td className='py-2 pr-4'>rim-light-strong + shadow-xl</td>
                <td className='py-2 pr-4'>—</td>
                <td className='py-2'>—</td>
              </tr>
              <tr>
                <td className='py-2 pr-4 font-mono'>emphasis-strong</td>
                <td className='py-2 pr-4'>rim-light-subtle</td>
                <td className='py-2 pr-4'>rim-light-subtle + shadow-sm</td>
                <td className='py-2'>none + press</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Intent tinting with emphasis presets */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Intent tinting</h2>
        <p className='text-subtle'>
          Shadows automatically tint based on the nearest <Code>intent-*</Code>{' '}
          ancestor. Works with both raw shadow utilities and emphasis presets.
        </p>

        <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
          {intents.map(({ name, className }) => (
            <div key={name} className={className}>
              <div className='is-interactive emphasis-raised rounded-xl p-6'>
                <p className='font-mono text-sm text-strong'>intent-{name}</p>
                <p className='mt-1 text-xs text-subtle'>
                  emphasis-raised — hover me
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Usage guidelines */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Usage guidelines</h2>

        <div className='grid gap-3'>
          <h3 className='text-display-ui-4 text-strong'>Choosing a level</h3>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-subtle text-left'>
                  <th className='py-2 pr-4 font-semibold'>Level</th>
                  <th className='py-2 pr-4 font-semibold'>Use for</th>
                  <th className='py-2 font-semibold'>Example</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-subtler'>
                <tr>
                  <td className='py-2 pr-4 font-mono'>shadow-xs</td>
                  <td className='py-2 pr-4'>Micro-separation, badges, tags</td>
                  <td className='py-2'>Pill badges, status dots</td>
                </tr>
                <tr>
                  <td className='py-2 pr-4 font-mono'>shadow-sm</td>
                  <td className='py-2 pr-4'>
                    Buttons, form controls, minor cards
                  </td>
                  <td className='py-2'>Action buttons, input fields</td>
                </tr>
                <tr>
                  <td className='py-2 pr-4 font-mono'>shadow-md</td>
                  <td className='py-2 pr-4'>Standard raised surfaces</td>
                  <td className='py-2'>Cards, panels, sticky headers</td>
                </tr>
                <tr>
                  <td className='py-2 pr-4 font-mono'>shadow-lg</td>
                  <td className='py-2 pr-4'>Hover states, featured content</td>
                  <td className='py-2'>
                    Card hover, featured listings, tooltips
                  </td>
                </tr>
                <tr>
                  <td className='py-2 pr-4 font-mono'>shadow-xl</td>
                  <td className='py-2 pr-4'>Floating UI, dropdowns</td>
                  <td className='py-2'>
                    Select menus, popovers, floating panels
                  </td>
                </tr>
                <tr>
                  <td className='py-2 pr-4 font-mono'>shadow-2xl</td>
                  <td className='py-2 pr-4'>Top-layer UI</td>
                  <td className='py-2'>Modals, dialogs, drawers</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className='grid gap-3'>
          <h3 className='text-display-ui-4 text-strong'>Best practices</h3>
          <ul className='grid list-disc gap-2 pl-5'>
            <li>
              <p>
                <strong>Prefer emphasis presets</strong> over raw shadow
                utilities. <Code>emphasis-raised</Code> handles background,
                shadow, rim light, and hover/active states together.
              </p>
            </li>
            <li>
              <p>
                Use <strong>one elevation level of separation</strong> between
                stacked surfaces. Don&apos;t jump from <Code>shadow-xs</Code> to{' '}
                <Code>shadow-2xl</Code>.
              </p>
            </li>
            <li>
              <p>
                <strong>Hover states</strong> should increase by one level (e.g.{' '}
                <Code>shadow-md</Code> at rest, <Code>shadow-lg</Code> on
                hover).
              </p>
            </li>
            <li>
              <p>
                <strong>Active/pressed states</strong> should decrease or remove
                shadow — the element feels pushed down.
              </p>
            </li>
            <li>
              <p>
                Use <Code>emphasis-floating</Code> for UI that overlaps content
                (popovers, dropdowns). Use <Code>emphasis-raised</Code> for
                surfaces that sit on the page (cards, panels).
              </p>
            </li>
            <li>
              <p>
                Intent tinting is automatic — just ensure the element is inside
                an <Code>intent-*</Code> container.
              </p>
            </li>
          </ul>
        </div>
      </section>
    </div>
  )
}
