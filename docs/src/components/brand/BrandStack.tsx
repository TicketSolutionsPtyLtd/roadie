import { Logo } from '@oztix/roadie-components/logo'
import { Mark } from '@oztix/roadie-components/mark'
import { Pattern } from '@oztix/roadie-components/pattern'
import {
  Heart,
  NoteMusic,
  Ticket
} from '@oztix/roadie-components/spot-illustrations'

// A poster is brand artwork, so it keeps its light colours in dark mode, from
// the pinned light steps.
const POSTER = {
  backgroundColor: 'var(--color-neutral-light-0)',
  color: 'var(--color-neutral-light-12)'
}
const LOGO = { color: 'var(--color-brand-blue-light-9)' }

/** The five parts of the brand in one small poster: colour, type, pattern, illustration, and logo. */
export function BrandStack() {
  return (
    <div
      data-not-prose
      data-slot='brand-stack'
      className='@container grid overflow-hidden rounded-2xl border border-subtler'
      style={POSTER}
    >
      <Pattern crop='banner' className='h-24 @md:h-32' />
      <div className='grid gap-6 p-6 @md:p-10'>
        <div className='flex flex-wrap items-end gap-3'>
          <Heart className='size-14' />
          <Ticket className='size-14' />
          <NoteMusic className='size-14' />
        </div>
        <p className='text-display-prose-2'>
          Australia’s <Mark intent='brand-purple'>ticketing partner</Mark>
        </p>
        <Logo size='lg' style={LOGO} aria-label='Oztix' />
      </div>
    </div>
  )
}
