import {
  FlowerSpiral,
  Heart,
  HighFive,
  MapPin,
  Ticket
} from '@oztix/roadie-components/spot-illustrations'

const ILLUSTRATIONS = { FlowerSpiral, Heart, HighFive, MapPin, Ticket }

/** A spot illustration a stat can show, by its component's name. */
export type SpotIllustrationName = keyof typeof ILLUSTRATIONS

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
      {items.map(({ value, label, illustration }) => {
        const Illustration = illustration && ILLUSTRATIONS[illustration]
        return (
          <li
            key={`${value}-${label}`}
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
