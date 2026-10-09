import { HeartIcon } from '@phosphor-icons/react/ssr'

import { getFamilyTokens } from '@/lib/tokens'

const REM_PX = 16

// Literal class names, so Tailwind finds them in this file.
const STEPS = [
  { step: 3, className: 'size-3' },
  { step: 4, className: 'size-4' },
  { step: 5, className: 'size-5' },
  { step: 6, className: 'size-6' }
]

/** The icon size tiers, each drawn at its size-* class with its size in pixels. */
export async function IconSizeScale() {
  const unit = (await getFamilyTokens('shape')).find(
    ({ name }) => name === '--spacing'
  )
  if (!unit) throw new Error('No --spacing token in the manifest.')
  const unitPx = parseFloat(unit.value!.light!) * REM_PX

  return (
    <ol
      data-not-prose
      data-slot='icon-size-scale'
      className='grid divide-y divide-subtler'
    >
      {STEPS.map(({ step, className }) => (
        <li
          key={step}
          data-slot='icon-size'
          className='grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-4 py-2'
        >
          <span className='grid place-items-center'>
            <HeartIcon weight='bold' className={className} />
          </span>
          <code className='font-mono text-sm text-strong'>{className}</code>
          <span className='font-mono text-sm text-subtle tabular-nums'>
            {step * unitPx}px
          </span>
        </li>
      ))}
    </ol>
  )
}
