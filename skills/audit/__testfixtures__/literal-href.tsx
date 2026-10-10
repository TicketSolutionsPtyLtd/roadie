export function HelpLinks({ event }) {
  return (
    <>
      <Button href='https://help.oztix.com.au'>Get help</Button>
      <Button href={event.ticketUrl}>Get tickets</Button>
      <Card render={<NextLink href='/events' />}>All events</Card>
    </>
  )
}
