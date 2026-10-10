import { focusRing } from '@/lib/foundation-scales'
import { getTokens } from '@/lib/tokens'

/** The focus ring tokens, each with what it sets and its value. */
export async function FocusRingList() {
  return (
    <dl
      data-not-prose
      data-slot='focus-ring-list'
      className='grid divide-y divide-subtler'
    >
      {focusRing(await getTokens()).map(({ name, label, value }) => (
        <div
          key={name}
          data-slot='focus-ring-row'
          data-token={name}
          data-twin-row
          className='grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 py-2'
        >
          <dt className='grid gap-0.5'>
            <span data-twin-cell className='text-sm text-strong'>
              {label}
            </span>
            <code data-twin-cell className='font-mono text-xs text-subtle'>
              {name}
            </code>
          </dt>
          <dd
            data-slot='focus-ring-value'
            data-twin-cell
            className='font-mono text-sm text-subtle tabular-nums'
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
