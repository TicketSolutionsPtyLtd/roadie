import { transitions } from '@/lib/foundation-scales'
import { getTokens } from '@/lib/tokens'

/** Each property `is-interactive` animates, with its duration and easing tokens. */
export async function TransitionList() {
  return (
    <ol
      data-not-prose
      data-slot='transition-list'
      className='grid grid-cols-[auto_auto_minmax(0,1fr)] divide-y divide-subtler'
    >
      {transitions(await getTokens()).map(({ property, duration, easing }) => (
        <li
          key={property}
          data-slot='transition-row'
          data-twin-row
          className='col-span-full grid grid-cols-subgrid items-baseline gap-4 py-2'
        >
          <code data-twin-cell className='font-mono text-sm text-strong'>
            {property}
          </code>
          <span
            data-slot='transition-duration'
            data-twin-cell
            className='font-mono text-sm text-subtle tabular-nums'
          >
            {duration}
          </span>
          <code
            data-slot='transition-easing'
            data-twin-cell
            className='font-mono text-sm text-subtle'
          >
            {easing}
          </code>
        </li>
      ))}
    </ol>
  )
}
