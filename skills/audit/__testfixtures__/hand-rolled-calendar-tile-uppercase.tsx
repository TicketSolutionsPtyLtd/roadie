export function EventDate({ startsAt }: { startsAt: Date }) {
  return (
    <div className='grid place-items-center rounded-lg border border-subtle p-2'>
      <span className='text-xs font-bold'>
        {startsAt.toLocaleString('en-AU', { month: 'short' }).toUpperCase()}
      </span>
      <span className='text-2xl'>{startsAt.getDate()}</span>
    </div>
  )
}
