import { durations } from '@/lib/foundation-scales'
import { getTokens } from '@/lib/tokens'

/** Each duration, then the stagger step, as a bar scaled to the longest, with its class and job. */
export async function DurationScale() {
  const rows = durations(await getTokens())
  const longest = Math.max(...rows.map(({ ms }) => ms))
  return (
    <ol
      data-not-prose
      data-slot='duration-scale'
      className='grid divide-y divide-subtler'
    >
      {rows.map(({ name, value, ms, className, job }) => (
        <li
          key={name}
          data-slot='duration-row'
          data-twin-row
          className='grid gap-1.5 py-3'
        >
          <div className='flex flex-wrap items-baseline gap-x-3 gap-y-1'>
            <code data-twin-cell className='font-mono text-sm text-strong'>
              {name}
            </code>
            <span
              data-slot='duration-value'
              data-twin-cell
              className='font-mono text-sm text-subtle tabular-nums'
            >
              {value}
            </span>
            {className ? (
              <code
                data-slot='duration-class'
                data-twin-cell
                className='font-mono text-sm text-subtle'
              >
                {className}
              </code>
            ) : (
              <span
                data-slot='duration-class'
                data-twin-cell
                className='text-sm text-subtler'
              >
                None
              </span>
            )}
          </div>
          <div
            data-slot='duration-bar'
            className='h-2 min-w-0.5 rounded-full bg-strong intent-brand'
            style={{ width: `${(ms / longest) * 100}%` }}
          />
          <span data-twin-cell className='text-sm text-subtle'>
            {job}
          </span>
        </li>
      ))}
    </ol>
  )
}
