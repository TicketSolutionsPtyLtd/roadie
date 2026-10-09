import { getFamilyTokens } from '@/lib/tokens'

const REM_PX = 16

const px = (rem: string) => parseFloat(rem) * REM_PX

/** `0.75rem` as 12px, and a fluid `clamp(min, …, max)` as its range. */
function sizeLabel(value: string) {
  const fluid = value.match(/^clamp\(\s*([\d.]+rem)\s*,.*,\s*([\d.]+rem)\s*\)$/)
  return fluid ? `${px(fluid[1]!)} to ${px(fluid[2]!)}px` : `${px(value)}px`
}

/** Every font size step, set in its own size, with its size or fluid range. */
export async function TypeScale() {
  const sizes = (await getFamilyTokens('typography')).filter(
    ({ group }) => group === 'Font sizes'
  )

  return (
    <ol
      data-not-prose
      data-slot='type-scale'
      className='grid divide-y divide-subtler'
    >
      {sizes.map(({ name, value }) => (
        <li
          key={name}
          data-slot='type-step'
          className='grid grid-cols-[3rem_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1 py-3 sm:grid-cols-[3rem_minmax(0,1fr)_auto]'
        >
          <code className='text-end font-mono text-sm text-strong'>
            {name.replace('--text-', '')}
          </code>
          <p
            data-slot='type-sample'
            className='text-normal'
            // A class built from data never reaches Tailwind, and Tailwind only emits
            // the size variables a build uses, so the token's value is the fallback.
            style={{
              fontSize: `var(${name}, ${value!.light!})`,
              lineHeight: 'var(--leading-display)'
            }}
          >
            The quick brown fox
          </p>
          <span
            data-slot='type-size'
            className='col-start-2 text-xs text-subtle tabular-nums sm:col-start-auto'
          >
            {sizeLabel(value!.light!)}
          </span>
        </li>
      ))}
    </ol>
  )
}
