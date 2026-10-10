import type { Size } from '@/lib/foundation-scales'

/** Named sizes as rows of name, rem, and px, smallest first. */
export function SizeList({ slot, sizes }: { slot: string; sizes: Size[] }) {
  return (
    <ol
      data-not-prose
      data-slot={slot}
      className='grid divide-y divide-subtler'
    >
      {sizes.map(({ name, size }) => (
        <li
          key={name}
          data-slot='size-row'
          data-twin-row
          className='grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 py-2'
        >
          <code data-twin-cell className='font-mono text-sm text-strong'>
            {name}
          </code>
          <span
            data-twin-cell
            className='font-mono text-sm text-subtle tabular-nums'
          >
            {size}
          </span>
        </li>
      ))}
    </ol>
  )
}
