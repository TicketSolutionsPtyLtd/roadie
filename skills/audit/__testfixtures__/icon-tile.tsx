export function Feature() {
  return (
    <div className='grid gap-2'>
      <IconTile intent='accent' shape='circle' className='rounded-full'>
        <TicketIcon />
      </IconTile>
      <span className='size-2 rounded-full bg-strong' />
      <TicketIcon />
      <p>Mobile tickets</p>
    </div>
  )
}
