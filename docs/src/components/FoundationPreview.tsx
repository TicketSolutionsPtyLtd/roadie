import {
  ArrowRightIcon,
  GearIcon,
  HandPointingIcon,
  HeartIcon,
  MoonIcon,
  PlusIcon,
  StarIcon,
  SunIcon,
  TrashIcon,
  WheelchairMotionIcon
} from '@phosphor-icons/react/ssr'

import { Code } from '@oztix/roadie-components/code'

import { ComponentSkeleton, Skel } from './ComponentSkeleton'

const INTENTS = [
  'intent-neutral',
  'intent-brand',
  'intent-accent',
  'intent-danger',
  'intent-success',
  'intent-warning',
  'intent-info'
]

const RADII = [
  'rounded-sm',
  'rounded-md',
  'rounded-lg',
  'rounded-xl',
  'rounded-full'
]

const SHADOWS = [
  ['shadow-xs', 'mb-0'],
  ['shadow-sm', 'mb-1'],
  ['shadow-md', 'mb-2'],
  ['shadow-lg', 'mb-3']
]

// Ease-out: each step covers less ground than the last.
const EASE_STEPS = [
  'bg-strong/15',
  'ms-8 bg-strong/25',
  'ms-5 bg-strong/35',
  'ms-3 bg-strong/45',
  'ms-1.5 bg-strong/55'
]

const LOAD_TIMES = ['h-12', 'h-9', 'h-7', 'h-5']

const SALES = ['h-4', 'h-6', 'h-5', 'h-8', 'h-10']

/** A foundation's preview art, authored at roughly `w-40` for `PreviewThumbnail`. */
export function FoundationPreview({ name }: { name: string }) {
  switch (name) {
    case 'colors':
      return (
        <div className='grid w-40 gap-1'>
          {['emphasis-strong', 'emphasis-subtle'].map((emphasis) => (
            <div key={emphasis} className='flex gap-1'>
              {INTENTS.map((intent) => (
                <div
                  key={intent}
                  className={`h-6 flex-1 rounded-sm ${intent} ${emphasis}`}
                />
              ))}
            </div>
          ))}
        </div>
      )
    case 'theming':
      return (
        <div className='grid justify-items-center gap-3'>
          <div className='flex gap-1 rounded-full bg-normal p-1'>
            <div className='grid size-7 emphasis-raised place-content-center rounded-full'>
              <SunIcon weight='bold' className='size-4' />
            </div>
            <div className='grid size-7 place-content-center text-subtle'>
              <MoonIcon weight='bold' className='size-4' />
            </div>
          </div>
          <div className='flex gap-2'>
            {['intent-accent', 'intent-brand', 'intent-success'].map(
              (intent) => (
                <div
                  key={intent}
                  className={`size-5 emphasis-strong rounded-full ${intent}`}
                />
              )
            )}
          </div>
        </div>
      )
    case 'shape':
      return (
        <div className='flex items-center gap-2'>
          {RADII.map((radius) => (
            <div key={radius} className={`size-7 emphasis-normal ${radius}`} />
          ))}
        </div>
      )
    case 'elevation':
      return (
        <div className='flex items-end gap-3'>
          {SHADOWS.map(([shadow, offset]) => (
            <div
              key={shadow}
              className={`size-8 rounded-lg bg-raised ${shadow} ${offset}`}
            />
          ))}
        </div>
      )
    case 'iconography':
      return (
        <div className='flex gap-2.5 text-strong'>
          <HeartIcon weight='bold' className='size-6' />
          <StarIcon weight='bold' className='size-6' />
          <PlusIcon weight='bold' className='size-6' />
          <TrashIcon weight='bold' className='size-6' />
          <GearIcon weight='bold' className='size-6' />
        </div>
      )
    case 'typography':
      return (
        <div className='grid w-40 gap-2'>
          <p className='text-5xl leading-none font-bold text-strong'>Aa</p>
          <Skel className='h-2 w-full' />
          <Skel className='h-2 w-24' />
        </div>
      )
    case 'layout':
      return (
        <div className='grid w-40 grid-cols-3 gap-1.5'>
          <div className='col-span-3 h-5 rounded-md border border-subtle bg-normal' />
          <div className='col-span-2 row-span-2 rounded-md border border-subtle bg-normal' />
          <div className='h-7 rounded-md border border-subtle bg-normal' />
          <div className='h-7 rounded-md border border-subtle bg-normal' />
        </div>
      )
    case 'date-and-time':
      return (
        <div className='flex items-center gap-3'>
          <ComponentSkeleton name='calendar-tile' />
          <div className='grid gap-1'>
            <p className='text-sm font-semibold text-strong'>Fri 27 Nov</p>
            <p className='text-xs text-subtle'>7:30pm AEDT</p>
          </div>
        </div>
      )
    case 'data-visualisation':
      return (
        <div className='relative flex h-16 w-40 items-end gap-1.5'>
          {SALES.map((height) => (
            <div
              key={height}
              className={`flex-1 rounded-t-sm bg-chart-context ${height}`}
            />
          ))}
          <div className='h-14 flex-1 rounded-t-sm bg-chart-highlight' />
          <div className='absolute inset-x-0 top-1 border-t-2 border-dashed border-chart-value' />
        </div>
      )
    case 'interactions':
      return (
        <div className='relative flex gap-2'>
          <div className='h-7 w-16 emphasis-normal rounded-full' />
          <div className='h-7 w-16 emphasis-strong rounded-full intent-accent' />
          <HandPointingIcon
            weight='bold'
            className='absolute -right-2 -bottom-4 size-6 text-strong'
          />
        </div>
      )
    case 'motion':
      return (
        <div className='flex w-40 items-center'>
          {EASE_STEPS.map((step) => (
            <div
              key={step}
              className={`size-3 shrink-0 rounded-full ${step}`}
            />
          ))}
          <div className='ms-1 size-4 shrink-0 emphasis-strong rounded-full intent-accent' />
        </div>
      )
    case 'view-transitions':
      return (
        <div className='relative h-20 w-40'>
          <div className='absolute top-0 left-0 grid h-14 w-24 content-start gap-1.5 rounded-lg border border-subtle bg-normal p-2 opacity-50'>
            <Skel className='h-2 w-12' />
            <Skel className='h-1.5 w-16' />
          </div>
          <div className='absolute right-0 bottom-0 grid h-14 w-24 emphasis-raised content-start gap-1.5 rounded-lg p-2'>
            <Skel className='h-2 w-12' />
            <Skel className='h-1.5 w-16' />
          </div>
        </div>
      )
    case 'accessibility':
      return (
        <div className='flex items-center gap-3'>
          <WheelchairMotionIcon weight='bold' className='size-6 text-strong' />
          <div className='rounded-full border-2 border-strong p-0.5 intent-accent'>
            <div className='h-7 w-16 emphasis-strong rounded-full' />
          </div>
        </div>
      )
    case 'navigation':
      return <ComponentSkeleton name='navigator' />
    case 'linking':
      return (
        <div className='flex items-center gap-2 text-subtle'>
          <Code>href</Code>
          <ArrowRightIcon weight='bold' className='size-4' />
          <Code>{'<a>'}</Code>
        </div>
      )
    case 'performance':
      return (
        <div className='flex items-end gap-1.5'>
          {LOAD_TIMES.map((height) => (
            <div
              key={height}
              className={`w-4 rounded-sm bg-strong/15 ${height}`}
            />
          ))}
          <div className='h-3 w-4 emphasis-strong rounded-sm intent-success' />
        </div>
      )
    default:
      return (
        <div className='grid w-40 gap-1.5'>
          <Skel className='h-2 w-20' />
          <Skel className='h-2 w-full' />
          <Skel className='h-2 w-16' />
        </div>
      )
  }
}
