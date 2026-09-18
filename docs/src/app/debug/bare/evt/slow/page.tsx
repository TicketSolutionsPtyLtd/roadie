import { Pane } from '@oztix/roadie-components'

// The bare canary's slow hop, so the frame that owns the window draws a
// pending indicator long enough to measure.
export default async function BareSlowPage() {
  await new Promise((resolve) => setTimeout(resolve, 1500))
  return (
    <Pane depth={2} data-testid='slow-pane'>
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
