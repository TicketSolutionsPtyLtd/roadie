export function ShowDate({
  startsAt,
  timeZone,
  month,
  day
}: {
  startsAt: string
  timeZone: string
  month: string
  day: string
}) {
  return (
    <div className='flex items-center gap-3'>
      <CalendarTile dateTime={startsAt} timeZone={timeZone} label='Doors open' />
      <p className='text-subtle'>
        {month} {day}
      </p>
    </div>
  )
}
