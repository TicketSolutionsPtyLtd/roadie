import { Pane } from '@oztix/roadie-components'

// A slow hop: one pending state must cover this segment's wait and its loading skeletons.
export default async function SlowPage() {
  await new Promise((resolve) => setTimeout(resolve, 1500))
  return (
    <Pane data-testid='slow-pane'>
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
