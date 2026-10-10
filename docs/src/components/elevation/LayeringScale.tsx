import { layeringTiers } from '@/lib/foundation-scales'
import { getTokens } from '@/lib/tokens'

/** The z-index tiers, top of the stack first, each with its utility and value. */
export async function LayeringScale() {
  return (
    <ol
      data-not-prose
      data-slot='layering-scale'
      className='grid divide-y divide-subtler'
    >
      {layeringTiers(await getTokens()).map(({ utility, value }) => (
        <li
          key={utility}
          data-slot='layering-tier'
          data-twin-row
          className='grid grid-cols-[3rem_minmax(0,1fr)] items-baseline gap-4 py-2'
        >
          <span
            data-twin-cell
            className='text-end font-mono text-sm text-subtle tabular-nums'
          >
            {value}
          </span>
          <code data-twin-cell className='font-mono text-sm text-strong'>
            {utility}
          </code>
        </li>
      ))}
    </ol>
  )
}
