import {
  HighFive,
  Ticket,
  type SpotIllustrationComponentProps
} from '@oztix/roadie-illustrations/spot'

export function Done(props: SpotIllustrationComponentProps) {
  return (
    <>
      <HighFive className='size-24' />
      <Ticket {...props} />
    </>
  )
}
