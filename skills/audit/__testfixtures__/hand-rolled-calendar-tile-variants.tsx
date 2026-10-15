import moment from 'moment'

type Glyph = { month: string; day: string }

export function IntlTile({ startsAt }: { startsAt: Date }) {
  return (
    <div className='grid place-items-center gap-0.5'>
      <span className='text-xs text-subtle'>
        {new Intl.DateTimeFormat('en-AU', {
          month: 'short',
          timeZone: 'Australia/Sydney'
        }).format(startsAt)}
      </span>
      <span className='text-display-ui-4'>
        {new Intl.DateTimeFormat('en-AU', {
          day: 'numeric',
          timeZone: 'Australia/Sydney'
        }).format(startsAt)}
      </span>
    </div>
  )
}

export function ChainedUppercaseTile({ startsAtLocal }: { startsAtLocal: Date }) {
  return (
    <div className='grid place-items-center gap-0.5'>
      <span className='text-xs font-bold'>
        {startsAtLocal
          .toLocaleString('en-AU', { month: 'short' })
          .toUpperCase()}
      </span>
      <span className='text-2xl'>{startsAtLocal.getUTCDate()}</span>
    </div>
  )
}

export function MomentTile({ startsAt }: { startsAt: Date }) {
  return (
    <div className='grid place-items-center gap-0.5'>
      <span className='text-xs'>{moment(startsAt).format('MMM')}</span>
      <span className='text-2xl'>{moment(startsAt).format('D')}</span>
    </div>
  )
}

export function GlyphTile({ glyph }: { glyph: Glyph }) {
  return (
    <div className='grid place-items-center gap-0.5'>
      <span className='text-xs uppercase'>{glyph.month}</span>
      <span className='text-2xl'>{glyph.day}</span>
    </div>
  )
}
