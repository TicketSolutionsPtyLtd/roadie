import { SPOT_ILLUSTRATIONS, type SpotIllustrationName } from './illustrations'

export type StatItem = {
  /** The number as written, such as `7 million+`. */
  value: string
  /** What the number counts, such as `tickets sold`. */
  label: string
  illustration?: SpotIllustrationName
}

/** The stats in a wrapping grid, each an illustration, a large value, and its label. */
export function StatList({ items }: { items: readonly StatItem[] }) {
  return (
    <ul className='grid grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),1fr))] gap-x-8 gap-y-2'>
      {items.map(({ value, label, illustration }, index) => {
        const Illustration = illustration && SPOT_ILLUSTRATIONS[illustration]
        return (
          <li
            key={`${index}-${value}-${label}`}
            className='flex items-center gap-4 py-1'
          >
            {Illustration && (
              <Illustration outline className='size-16 shrink-0' />
            )}
            <div>
              <p className='text-display-ui-3 text-strong'>{value}</p>
              <p className='text-subtle'>{label}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
