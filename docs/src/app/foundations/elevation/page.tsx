import { Code, Heading, Text } from '@oztix/roadie-components'

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
    <div className='view gap-10'>
      <div className='view gap-3'>
        <Heading as='h1' className='text-display-prose-1'>
          Elevation
        </Heading>
        <Text size='lg' emphasis='subtle'>
          Shadows are tinted with the current intent&apos;s hue using CSS-native{' '}
          <Code>oklch()</Code>. A card inside <Code>intent-danger</Code>{' '}
          automatically gets red-tinted shadows. Uses Tailwind&apos;s standard
          shadow utilities.
        </Text>
      </div>

      {/* Shadow scale */}
      <section className='view gap-4'>
        <Heading as='h2' className='text-display-ui-3'>
          Shadow scale
        </Heading>
        <Text emphasis='subtle'>
          Each level uses multi-layer shadows with geometric scaling. Apply with{' '}
          <Code>shadow-sm</Code>, <Code>shadow-lg</Code>, etc.
        </Text>

        <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
          {shadowScale.map(({ name, description, className }) => (
            <div key={name} className='view gap-2'>
              <div
                className={`${className} rounded-lg emphasis-raised-surface p-6`}
              >
                <Text size='sm' emphasis='strong' className='font-mono'>
                  {name}
                </Text>
              </div>
              <Text size='sm' emphasis='subtle'>
                {description}
              </Text>
            </div>
          ))}
        </div>
      </section>

      {/* Inset shadows */}
      <section className='view gap-4'>
        <Heading as='h2' className='text-display-ui-3'>
          Inset shadows
        </Heading>
        <Text emphasis='subtle'>
          For sunken surfaces like input fields and wells. Apply with{' '}
          <Code>inset-shadow-xs</Code> or <Code>inset-shadow-sm</Code>.
        </Text>

        <div className='grid gap-6 sm:grid-cols-2'>
          {insetScale.map(({ name, description, className }) => (
            <div key={name} className='view gap-2'>
              <div
                className={`${className} rounded-lg emphasis-default-surface p-6`}
              >
                <Text size='sm' emphasis='strong' className='font-mono'>
                  {name}
                </Text>
              </div>
              <Text size='sm' emphasis='subtle'>
                {description}
              </Text>
            </div>
          ))}
        </div>
      </section>

      {/* Rim light */}
      <section className='view gap-4'>
        <Heading as='h2' className='text-display-ui-3'>
          Rim light
        </Heading>
        <Text emphasis='subtle'>
          A subtle inner highlight for raised surfaces. Adds a polished,
          glass-like edge. Apply with <Code>rim-light</Code>. Already included
          in <Code>emphasis-raised</Code> and <Code>emphasis-floating</Code>.
        </Text>

        <div className='grid gap-6 sm:grid-cols-2'>
          <div className='view gap-2'>
            <div className='rim-light shadow-md rounded-lg emphasis-raised-surface p-6'>
              <Text size='sm' emphasis='strong' className='font-mono'>
                rim-light + shadow-md
              </Text>
            </div>
            <Text size='sm' emphasis='subtle'>
              Combine with any shadow level for depth + highlight
            </Text>
          </div>
        </div>
      </section>

      {/* Emphasis presets */}
      <section className='view gap-4'>
        <Heading as='h2' className='text-display-ui-3'>
          Emphasis presets
        </Heading>
        <Text emphasis='subtle'>
          The emphasis system includes elevation-aware presets that combine
          background, shadow, and interactive states. These are the recommended
          way to apply elevation.
        </Text>

        <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
          {emphasisPresets.map(
            ({ name, description, className, interactive }) => (
              <div key={name} className='view gap-2'>
                <div
                  className={`${className} ${interactive ? 'is-interactive' : ''} rounded-lg p-6`}
                >
                  <Text size='sm' emphasis='strong' className='font-mono'>
                    {name}
                  </Text>
                  {interactive && (
                    <Text size='xs' emphasis='subtle' className='mt-1'>
                      Hover and click me
                    </Text>
                  )}
                </div>
                <Text size='sm' emphasis='subtle'>
                  {description}
                </Text>
              </div>
            )
          )}
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-emphasis-subtle text-left'>
                <th className='py-2 pr-4 font-semibold'>Preset</th>
                <th className='py-2 pr-4 font-semibold'>Shadow</th>
                <th className='py-2 pr-4 font-semibold'>Hover</th>
                <th className='py-2 font-semibold'>Active</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-emphasis-subtler'>
              <tr>
                <td className='py-2 pr-4 font-mono'>emphasis-raised</td>
                <td className='py-2 pr-4'>rim-light + shadow-md</td>
                <td className='py-2 pr-4'>rim-light + shadow-lg</td>
                <td className='py-2'>rim-light + shadow-sm</td>
              </tr>
              <tr>
                <td className='py-2 pr-4 font-mono'>emphasis-sunken</td>
                <td className='py-2 pr-4'>inset-shadow-sm</td>
                <td className='py-2 pr-4'>—</td>
                <td className='py-2'>—</td>
              </tr>
              <tr>
                <td className='py-2 pr-4 font-mono'>emphasis-floating</td>
                <td className='py-2 pr-4'>rim-light + shadow-xl</td>
                <td className='py-2 pr-4'>—</td>
                <td className='py-2'>—</td>
              </tr>
              <tr>
                <td className='py-2 pr-4 font-mono'>emphasis-strong</td>
                <td className='py-2 pr-4'>none</td>
                <td className='py-2 pr-4'>shadow-sm + lift</td>
                <td className='py-2'>none + press</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Intent tinting with emphasis presets */}
      <section className='view gap-4'>
        <Heading as='h2' className='text-display-ui-3'>
          Intent tinting
        </Heading>
        <Text emphasis='subtle'>
          Shadows automatically tint based on the nearest <Code>intent-*</Code>{' '}
          ancestor. Works with both raw shadow utilities and emphasis presets.
        </Text>

        <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
          {intents.map(({ name, className }) => (
            <div key={name} className={className}>
              <div className='emphasis-raised is-interactive rounded-lg p-6'>
                <Text size='sm' emphasis='strong' className='font-mono'>
                  intent-{name}
                </Text>
                <Text size='xs' emphasis='subtle' className='mt-1'>
                  emphasis-raised — hover me
                </Text>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Usage guidelines */}
      <section className='view gap-4'>
        <Heading as='h2' className='text-display-ui-3'>
          Usage guidelines
        </Heading>

        <div className='view gap-3'>
          <Heading as='h3' className='text-display-ui-4'>
            Choosing a level
          </Heading>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-emphasis-subtle text-left'>
                  <th className='py-2 pr-4 font-semibold'>Level</th>
                  <th className='py-2 pr-4 font-semibold'>Use for</th>
                  <th className='py-2 font-semibold'>Example</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-emphasis-subtler'>
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

        <div className='view gap-3'>
          <Heading as='h3' className='text-display-ui-4'>
            Best practices
          </Heading>
          <ul className='view gap-2 list-disc pl-5'>
            <li>
              <Text>
                <strong>Prefer emphasis presets</strong> over raw shadow
                utilities. <Code>emphasis-raised</Code> handles background,
                shadow, rim light, and hover/active states together.
              </Text>
            </li>
            <li>
              <Text>
                Use <strong>one elevation level of separation</strong> between
                stacked surfaces. Don&apos;t jump from <Code>shadow-xs</Code> to{' '}
                <Code>shadow-2xl</Code>.
              </Text>
            </li>
            <li>
              <Text>
                <strong>Hover states</strong> should increase by one level (e.g.{' '}
                <Code>shadow-md</Code> at rest, <Code>shadow-lg</Code> on
                hover).
              </Text>
            </li>
            <li>
              <Text>
                <strong>Active/pressed states</strong> should decrease or remove
                shadow — the element feels pushed down.
              </Text>
            </li>
            <li>
              <Text>
                Use <Code>emphasis-floating</Code> for UI that overlaps content
                (popovers, dropdowns). Use <Code>emphasis-raised</Code> for
                surfaces that sit on the page (cards, panels).
              </Text>
            </li>
            <li>
              <Text>
                Intent tinting is automatic — just ensure the element is inside
                an <Code>intent-*</Code> container.
              </Text>
            </li>
          </ul>
        </div>
      </section>
    </div>
  )
}
