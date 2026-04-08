import {
  CaretDownIcon,
  CheckCircleIcon,
  GearIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  StarIcon,
  TrashIcon
} from '@phosphor-icons/react/ssr'

import { Guideline } from '@/components/Guideline'

import { Badge, Button, Code, IconButton } from '@oztix/roadie-components'

export const metadata = {
  title: 'Iconography',
  description:
    'Icon library, weight conventions, sizing scale, and import patterns for Phosphor Bold icons.'
}

const sizingScale = [
  {
    tier: 'XS',
    size: '12px',
    className: 'size-3',
    useFor: 'Badges, tags, compact elements, chevrons in small buttons'
  },
  {
    tier: 'SM',
    size: '16px',
    className: 'size-4',
    useFor: 'Buttons, inline with body text (default)'
  },
  {
    tier: 'MD',
    size: '20px',
    className: 'size-5',
    useFor: 'Navigation, standalone actions'
  },
  {
    tier: 'LG',
    size: '24px',
    className: 'size-6',
    useFor: 'Page headers, feature cards, hero sections'
  }
]

const showcaseIcons = [
  { name: 'Heart', Icon: HeartIcon },
  { name: 'Star', Icon: StarIcon },
  { name: 'Plus', Icon: PlusIcon },
  { name: 'Trash', Icon: TrashIcon },
  { name: 'MagnifyingGlass', Icon: MagnifyingGlassIcon },
  { name: 'Gear', Icon: GearIcon },
  { name: 'CaretDown', Icon: CaretDownIcon },
  { name: 'CheckCircle', Icon: CheckCircleIcon }
]

export default function IconographyPage() {
  return (
    <div className='grid gap-12'>
      {/* Hero */}
      <div className='grid gap-3'>
        <h1 className='text-display-prose-1 text-strong'>Iconography</h1>
        <p className='text-lg text-subtle'>
          Roadie uses{' '}
          <a
            href='https://phosphoricons.com/'
            target='_blank'
            rel='noopener noreferrer'
            className='underline'
          >
            Phosphor Icons
          </a>{' '}
          at the Bold weight. The thicker strokes pair with the system&apos;s
          rounded, approachable visual language and stay legible at small sizes.
        </p>
      </div>

      {/* Principles */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Principles</h2>
        <ul className='grid list-disc gap-2 pl-5'>
          <li>
            <p>
              <strong>Use icons intentionally.</strong> Pair with text labels
              wherever possible. Avoid decorative-only icons that add clutter
              without aiding comprehension.
            </p>
          </li>
          <li>
            <p>
              <strong>Prefer existing icons.</strong> Browse{' '}
              <a
                href='https://phosphoricons.com/'
                target='_blank'
                rel='noopener noreferrer'
                className='underline'
              >
                Phosphor&apos;s library
              </a>{' '}
              before considering custom SVGs. Reusing established metaphors
              keeps the system consistent.
            </p>
          </li>
          <li>
            <p>
              <strong>Keep it consistent.</strong> Always Bold weight. Only use
              Fill for active or selected states. Never mix Regular, Thin, or
              Light weights.
            </p>
          </li>
        </ul>
      </section>

      {/* Icon showcase */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Visual style</h2>
        <p className='text-subtle'>
          Bold weight provides thicker strokes that are more legible at small
          sizes and create a confident, approachable feel. Here are some
          commonly used icons in the system.
        </p>

        <div className='grid grid-cols-4 gap-4 sm:grid-cols-8'>
          {showcaseIcons.map(({ name, Icon }) => (
            <div key={name} className='grid place-items-center gap-2'>
              <div className='grid size-12 place-content-center rounded-xl bg-raised'>
                <Icon weight='bold' className='size-6' />
              </div>
              <p className='text-center font-mono text-xs text-subtle'>
                {name}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Weight */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Weight</h2>
        <p className='text-subtle'>
          Two weights are used in the system. Bold is the default for
          everything. Fill is reserved for active or selected states only.
        </p>

        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-subtle text-left'>
                <th className='py-2 pr-4 font-semibold'>Weight</th>
                <th className='py-2 pr-4 font-semibold'>When to use</th>
                <th className='py-2 font-semibold'>Preview</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-subtler'>
              <tr>
                <td className='py-2 pr-4 font-mono text-xs text-strong'>
                  bold
                </td>
                <td className='py-2 pr-4 text-subtle'>Default for all icons</td>
                <td className='py-2'>
                  <div className='flex gap-3'>
                    <HeartIcon weight='bold' className='size-5' />
                    <StarIcon weight='bold' className='size-5' />
                    <CheckCircleIcon weight='bold' className='size-5' />
                  </div>
                </td>
              </tr>
              <tr>
                <td className='py-2 pr-4 font-mono text-xs text-strong'>
                  fill
                </td>
                <td className='py-2 pr-4 text-subtle'>
                  Active or selected states only
                </td>
                <td className='py-2'>
                  <div className='flex gap-3'>
                    <HeartIcon weight='fill' className='size-5' />
                    <StarIcon weight='fill' className='size-5' />
                    <CheckCircleIcon weight='fill' className='size-5' />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bold vs Fill visual example */}
        <div className='grid gap-2'>
          <p className='text-sm text-subtle'>
            Example: navigation items using Bold (inactive) and Fill (active).
          </p>
          <div className='flex gap-1 rounded-xl bg-raised p-2'>
            <span className='flex items-center gap-2 rounded-lg emphasis-subtle px-3 py-2 text-sm font-semibold intent-accent'>
              <HeartIcon weight='fill' className='size-4' />
              Favourites
            </span>
            <span className='flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-subtle'>
              <StarIcon weight='bold' className='size-4' />
              Starred
            </span>
            <span className='flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-subtle'>
              <GearIcon weight='bold' className='size-4' />
              Settings
            </span>
          </div>
        </div>
      </section>

      {/* Sizing scale */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Sizing</h2>
        <p className='text-subtle'>
          Four fixed tiers mapped to component contexts. Use Tailwind{' '}
          <Code>size-*</Code> utilities via <Code>className</Code> to set icon
          size.
        </p>

        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-subtle text-left'>
                <th className='py-2 pr-4 font-semibold'>Tier</th>
                <th className='py-2 pr-4 font-semibold'>Size</th>
                <th className='py-2 pr-4 font-semibold'>Class</th>
                <th className='py-2 pr-4 font-semibold'>Use for</th>
                <th className='py-2 font-semibold'>Preview</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-subtler'>
              {sizingScale.map(({ tier, size, className, useFor }) => (
                <tr key={tier}>
                  <td className='py-2 pr-4 text-strong'>{tier}</td>
                  <td className='py-2 pr-4 tabular-nums'>{size}</td>
                  <td className='py-2 pr-4 font-mono text-xs'>{className}</td>
                  <td className='py-2 pr-4 text-subtle'>{useFor}</td>
                  <td className='py-2'>
                    <HeartIcon weight='bold' className={className} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className='rounded-xl bg-raised p-4'>
          <p className='text-sm text-subtle'>
            <strong className='text-normal'>Auto-sizing in components:</strong>{' '}
            Badge and Button auto-size child SVGs via CSS (
            <Code>[&_svg]:size-[1em]</Code> and <Code>[&_svg]:size-4</Code>).
            You typically don&apos;t need an explicit size class when placing
            icons inside these components.
          </p>
        </div>
      </section>

      {/* Import conventions */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Import conventions</h2>

        <Guideline
          title='Use the Icon suffix export'
          description={
            <>
              Phosphor exports each icon with an <Code>Icon</Code> suffix.
              Always use the suffixed export — the bare name is deprecated.
            </>
          }
        >
          <Guideline.Do
            code={`import {\n  HeartIcon,\n  StarIcon\n} from '@phosphor-icons/react/ssr'`}
          >
            Import the <Code>Icon</Code>-suffixed export directly.
          </Guideline.Do>
          <Guideline.Dont
            code={`import {\n  Heart,\n  Star\n} from '@phosphor-icons/react/ssr'`}
          >
            Bare names are deprecated and can collide with component or variable
            names.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='Use the SSR import for server components'
          description={
            <>
              Phosphor provides a <Code>/ssr</Code> entry point that avoids
              hydration mismatches in server components.
            </>
          }
        >
          <Guideline.Do
            code={`// Server component (no 'use client')\nimport {\n  HeartIcon\n} from '@phosphor-icons/react/ssr'`}
          >
            Use <Code>@phosphor-icons/react/ssr</Code> in server components.
          </Guideline.Do>
          <Guideline.Dont
            code={`// Server component (no 'use client')\nimport {\n  HeartIcon\n} from '@phosphor-icons/react'`}
          >
            The standard import can cause hydration errors in server components.
          </Guideline.Dont>
        </Guideline>
      </section>

      {/* Color */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Color</h2>
        <p className='text-subtle'>
          Icons inherit <Code>currentColor</Code> by default. Use{' '}
          <Code>text-*</Code> utilities to set icon color, or let them inherit
          from a parent intent context.
        </p>

        <div className='flex flex-wrap items-center gap-6'>
          <div className='grid place-items-center gap-1'>
            <HeartIcon weight='bold' className='size-6 text-normal' />
            <p className='font-mono text-xs text-subtle'>text-normal</p>
          </div>
          <div className='grid place-items-center gap-1'>
            <HeartIcon weight='bold' className='size-6 text-subtle' />
            <p className='font-mono text-xs text-subtle'>text-subtle</p>
          </div>
          <div className='grid place-items-center gap-1'>
            <HeartIcon weight='bold' className='size-6 text-strong' />
            <p className='font-mono text-xs text-subtle'>text-strong</p>
          </div>
          <div className='grid place-items-center gap-1 intent-danger'>
            <HeartIcon weight='bold' className='size-6' />
            <p className='font-mono text-xs text-subtle'>intent-danger</p>
          </div>
          <div className='grid place-items-center gap-1 intent-success'>
            <CheckCircleIcon weight='bold' className='size-6' />
            <p className='font-mono text-xs text-subtle'>intent-success</p>
          </div>
        </div>
      </section>

      {/* Guidelines */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Guidelines</h2>

        <Guideline
          title='Pair icons with text labels'
          description='Icons are most effective when paired with text. Use icon-only buttons only when the action is universally understood, and always provide an aria-label.'
        >
          <Guideline.Do
            example={
              <div className='flex flex-wrap items-center gap-2'>
                <Button emphasis='strong'>
                  <PlusIcon weight='bold' className='size-4' />
                  Add item
                </Button>
                <IconButton aria-label='Delete item' emphasis='subtle'>
                  <TrashIcon weight='bold' className='size-4' />
                </IconButton>
              </div>
            }
          >
            Pair icons with visible text. For icon-only buttons, use{' '}
            <Code>IconButton</Code> which requires <Code>aria-label</Code>.
          </Guideline.Do>
          <Guideline.Dont
            example={
              <div className='flex flex-wrap items-center gap-2'>
                <button className='is-interactive emphasis-strong rounded-full p-2.5'>
                  <PlusIcon weight='bold' className='size-4' />
                </button>
              </div>
            }
          >
            Don&apos;t use plain buttons with icons and no label or aria-label.
            Screen readers won&apos;t know what the button does.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='Use Bold weight consistently'
          description={
            <>
              All icons should use <Code>weight=&quot;bold&quot;</Code>.
              Don&apos;t mix weights — it breaks visual harmony.
            </>
          }
        >
          <Guideline.Do
            example={
              <div className='flex items-center gap-3'>
                <HeartIcon weight='bold' className='size-5' />
                <StarIcon weight='bold' className='size-5' />
                <GearIcon weight='bold' className='size-5' />
                <TrashIcon weight='bold' className='size-5' />
              </div>
            }
          >
            All icons at Bold weight for a consistent stroke width.
          </Guideline.Do>
          <Guideline.Dont
            example={
              <div className='flex items-center gap-3'>
                <HeartIcon weight='bold' className='size-5' />
                <StarIcon weight='regular' className='size-5' />
                <GearIcon weight='thin' className='size-5' />
                <TrashIcon weight='light' className='size-5' />
              </div>
            }
          >
            Mixing weights creates visual inconsistency. Regular, Thin, and
            Light look out of place next to Bold.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='Reserve Fill for active states'
          description="Fill weight signals that something is selected or active. Don't use it as the default."
        >
          <Guideline.Do
            example={
              <div className='flex items-center gap-1'>
                <span className='flex items-center gap-1.5 rounded-lg emphasis-subtle px-3 py-1.5 text-sm font-semibold intent-accent'>
                  <HeartIcon weight='fill' className='size-4' />
                  Active
                </span>
                <span className='flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-subtle'>
                  <StarIcon weight='bold' className='size-4' />
                  Inactive
                </span>
              </div>
            }
          >
            Fill for the active item, Bold for everything else.
          </Guideline.Do>
          <Guideline.Dont
            example={
              <div className='flex items-center gap-1'>
                <span className='flex items-center gap-1.5 rounded-lg emphasis-subtle px-3 py-1.5 text-sm font-semibold intent-accent'>
                  <HeartIcon weight='fill' className='size-4' />
                  Active
                </span>
                <span className='flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-subtle'>
                  <StarIcon weight='fill' className='size-4' />
                  Inactive
                </span>
              </div>
            }
          >
            Fill on inactive items removes the visual distinction for the active
            state.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='Match icon size to context'
          description='Use the sizing scale to keep icons proportional to their surroundings.'
        >
          <Guideline.Do
            example={
              <div className='flex flex-wrap items-center gap-3'>
                <Badge intent='success'>
                  <CheckCircleIcon weight='bold' /> Verified
                </Badge>
                <Button size='sm'>
                  <PlusIcon weight='bold' />
                  Add
                </Button>
              </div>
            }
          >
            Let components auto-size icons, or use the appropriate tier for the
            context.
          </Guideline.Do>
          <Guideline.Dont
            example={
              <div className='flex flex-wrap items-center gap-3'>
                <span className='flex items-center gap-1 text-sm text-subtle'>
                  <CheckCircleIcon weight='bold' className='size-6' /> Verified
                </span>
                <span className='flex items-center gap-1 text-sm text-subtle'>
                  <PlusIcon weight='bold' className='size-6' /> Add item
                </span>
              </div>
            }
          >
            Oversized icons next to small text look unbalanced. Match the icon
            tier to the text size.
          </Guideline.Dont>
        </Guideline>
      </section>

      {/* Best practices */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Best practices</h2>
        <ul className='grid list-disc gap-2 pl-5'>
          <li>
            <p>
              <strong>
                Always set <Code>weight=&quot;bold&quot;</Code>
              </strong>{' '}
              explicitly. Phosphor&apos;s default is Regular, not Bold.
            </p>
          </li>
          <li>
            <p>
              <strong>
                Use <Code>aria-label</Code> on icon-only buttons.
              </strong>{' '}
              The <Code>IconButton</Code> component enforces this as a required
              prop.
            </p>
          </li>
          <li>
            <p>
              <strong>
                Browse icons at{' '}
                <a
                  href='https://phosphoricons.com/'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='underline'
                >
                  phosphoricons.com
                </a>
              </strong>{' '}
              — filter by Bold weight to see what&apos;s available.
            </p>
          </li>
          <li>
            <p>
              <strong>
                Icons inherit <Code>currentColor</Code>.
              </strong>{' '}
              Use <Code>text-*</Code> utilities for color. Don&apos;t use inline
              styles or the Phosphor <Code>color</Code> prop.
            </p>
          </li>
          <li>
            <p>
              <strong>Inside Badge and Button, icons auto-size.</strong> No
              explicit <Code>className</Code> size needed — the component CSS
              handles it.
            </p>
          </li>
          <li>
            <p>
              <strong>
                Use <Code>@phosphor-icons/react/ssr</Code>
              </strong>{' '}
              for server components. Only use <Code>@phosphor-icons/react</Code>{' '}
              in files with <Code>&apos;use client&apos;</Code>.
            </p>
          </li>
        </ul>
      </section>
    </div>
  )
}
