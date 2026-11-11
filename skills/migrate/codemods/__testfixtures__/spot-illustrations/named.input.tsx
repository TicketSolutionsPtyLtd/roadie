import {
  HighFive,
  Ticket,
  type TicketProps
} from '@oztix/roadie-components/spot-illustrations'

export function Done(props: TicketProps) {
  return (
    <>
      <HighFive className='size-24' />
      <Ticket {...props} />
    </>
  )
}
