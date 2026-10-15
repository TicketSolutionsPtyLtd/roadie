import { format } from 'date-fns'

export function ShowDate({ day }: { day: Date }) {
  return (
    <div className='grid place-items-center gap-0.5'>
      <span className='text-xs text-subtle'>{format(day, 'MMM')}</span>
      <span className='text-display-ui-4'>{format(day, 'd')}</span>
    </div>
  )
}
