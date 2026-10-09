const REM_PX = 16

export const remToPx = (rem: string) => `${parseFloat(rem) * REM_PX}px`

/** Named sizes as rows of name, rem, and px, smallest first. */
export function SizeList({
  slot,
  sizes
}: {
  slot: string
  sizes: { name: string; rem: string }[]
}) {
  return (
    <ol
      data-not-prose
      data-slot={slot}
      className='grid divide-y divide-subtler'
    >
      {sizes.map(({ name, rem }) => (
        <li
          key={name}
          data-slot='size-row'
          className='grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 py-2'
        >
          <code className='font-mono text-sm text-strong'>{name}</code>
          <span className='font-mono text-sm text-subtle tabular-nums'>
            {rem} <span data-slot='size-px'>({remToPx(rem)})</span>
          </span>
        </li>
      ))}
    </ol>
  )
}
