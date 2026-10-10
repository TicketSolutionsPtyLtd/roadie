import { typeSteps } from '@/lib/foundation-scales'
import { getTokens } from '@/lib/tokens'

/** Every font size step, set in its own size, with its size or fluid range. */
export async function TypeScale() {
  return (
    <ol
      data-not-prose
      data-slot='type-scale'
      className='grid divide-y divide-subtler'
    >
      {typeSteps(await getTokens()).map(({ name, step, value, size }) => (
        <li
          key={name}
          data-slot='type-step'
          data-twin-row
          className='grid grid-cols-[3rem_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1 py-3 sm:grid-cols-[3rem_minmax(0,1fr)_auto]'
        >
          <code
            data-twin-cell
            className='text-end font-mono text-sm text-strong'
          >
            {step}
          </code>
          <p
            data-slot='type-sample'
            className='text-normal'
            // A class built from data never reaches Tailwind, and Tailwind only emits
            // the size variables a build uses, so the token's value is the fallback.
            style={{
              fontSize: `var(${name}, ${value})`,
              lineHeight: 'var(--leading-display)'
            }}
          >
            The quick brown fox
          </p>
          <span
            data-slot='type-size'
            data-twin-cell
            className='col-start-2 text-xs text-subtle tabular-nums sm:col-start-auto'
          >
            {size}
          </span>
        </li>
      ))}
    </ol>
  )
}
