import { getFamilyTokens } from '@/lib/tokens'

import { remToPx } from './SizeList'

// The steps layouts reach for. Tailwind accepts any multiple of the unit.
const STEPS = [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24]

/** Common spacing steps, each as a bar as wide as the step. */
export async function SpacingScale() {
  const unit = (await getFamilyTokens('shape')).find(
    ({ name }) => name === '--spacing'
  )
  if (!unit) throw new Error('No --spacing token in the manifest.')
  const unitRem = parseFloat(unit.value!.light!)

  return (
    <ol data-not-prose data-slot='spacing-scale' className='grid gap-1'>
      {STEPS.map((step) => (
        <li
          key={step}
          data-slot='spacing-step'
          className='grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3'
        >
          <code className='text-end font-mono text-sm text-strong tabular-nums'>
            {step}
          </code>
          <div className='flex items-center gap-3'>
            <div
              data-slot='spacing-bar'
              className='h-6 shrink-0 rounded-sm bg-strong intent-brand'
              // A class built from data never reaches Tailwind, so the bar reads the token.
              style={{ width: `calc(var(--spacing) * ${step})` }}
            />
            <span className='text-xs text-subtle tabular-nums'>
              {remToPx(`${step * unitRem}rem`)}
            </span>
          </div>
        </li>
      ))}
    </ol>
  )
}
