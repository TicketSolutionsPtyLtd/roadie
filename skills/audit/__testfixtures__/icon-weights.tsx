export function Toolbar({ saved }: { saved: boolean }) {
  return (
    <div className='flex gap-2'>
      <HeartIcon weight={saved ? 'fill' : 'bold'} className='size-4' />
      <TicketIcon weight='duotone' className='size-4' />
      <StarIcon weight='bold' className='size-4' />
    </div>
  )
}
