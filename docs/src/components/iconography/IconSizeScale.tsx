import { HeartIcon } from '@phosphor-icons/react/ssr'

import { iconSizes } from '@/lib/foundation-scales'
import { getTokens } from '@/lib/tokens'

/** The icon size tiers, each drawn at its size-* class with its size in pixels. */
export async function IconSizeScale() {
  return (
    <ol
      data-not-prose
      data-slot='icon-size-scale'
      className='grid divide-y divide-subtler'
    >
      {iconSizes(await getTokens()).map(({ className, px }) => (
        <li
          key={className}
          data-slot='icon-size'
          data-twin-row
          className='grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-4 py-2'
        >
          <span className='grid place-items-center'>
            <HeartIcon weight='bold' className={className} />
          </span>
          <code data-twin-cell className='font-mono text-sm text-strong'>
            {className}
          </code>
          <span
            data-twin-cell
            className='font-mono text-sm text-subtle tabular-nums'
          >
            {px}
          </span>
        </li>
      ))}
    </ol>
  )
}
