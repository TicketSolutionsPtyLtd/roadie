import { Pane } from '@oztix/roadie-components'

// The canary's slow hop: the pending indicator has to cover the wait for this
// segment, then the skeletons its loading state draws, as one state.
export default async function SlowPage() {
  await new Promise((resolve) => setTimeout(resolve, 1500))
  return (
    <Pane role='detail' depth={2} current data-testid='slow-pane'>
      <Pane.Header>
        <Pane.Title>Slow</Pane.Title>
      </Pane.Header>
      <div className='grid gap-2 p-4'>
        {Array.from({ length: 30 }, (_, at) => (
          <p key={at} className='py-2'>
            slow line {at}
          </p>
        ))}
      </div>
    </Pane>
  )
}
