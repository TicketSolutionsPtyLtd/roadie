import { spacingSteps } from '@/lib/foundation-scales'
import { getTokens } from '@/lib/tokens'

/** Common spacing steps, each as a bar as wide as the step. */
export async function SpacingScale() {
  return (
    <ol data-not-prose data-slot='spacing-scale' className='grid gap-1'>
      {spacingSteps(await getTokens()).map(({ step, px }) => (
        <li
          key={step}
          data-slot='spacing-step'
          data-twin-row
          className='grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3'
        >
          <code
            data-twin-cell
            className='text-end font-mono text-sm text-strong tabular-nums'
          >
            {step}
          </code>
          <div className='flex items-center gap-3'>
            <div
              data-slot='spacing-bar'
              className='h-6 shrink-0 rounded-sm bg-strong intent-brand'
              // A class built from data never reaches Tailwind, so the bar reads the token.
              style={{ width: `calc(var(--spacing) * ${step})` }}
            />
            <span data-twin-cell className='text-xs text-subtle tabular-nums'>
              {px}
            </span>
          </div>
        </li>
      ))}
    </ol>
  )
}
