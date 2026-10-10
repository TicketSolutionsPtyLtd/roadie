export function TicketLinks({ event, track }) {
  return (
    <>
      <Button render={<a href={event.ticketUrl} />}>Get tickets</Button>
      <Button
        intent='accent'
        onClick={() => track('tickets')}
        render={<a href={event.ticketUrl} target='_blank' rel='noreferrer' />}
      >
        Get tickets
      </Button>
    </>
  )
}
