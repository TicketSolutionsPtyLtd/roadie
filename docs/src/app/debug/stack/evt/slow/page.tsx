import { Pane, Skeleton } from '@oztix/roadie-components'

const skeleton = (
  <div data-testid='slow-loading' className='grid gap-3 p-4'>
    {Array.from({ length: 12 }, (_, at) => (
      <div key={at} className='grid gap-2'>
        <Skeleton className='w-2/3' />
        <Skeleton />
        <Skeleton className='w-1/2' />
      </div>
    ))}
  </div>
)

export default function SlowPage() {
  return (
    <Pane data-testid='slow-pane'>
      <Pane.Header>
        <Pane.Title>Slow</Pane.Title>
      </Pane.Header>
      <Pane.Body loading={skeleton}>
        <SlowLines />
      </Pane.Body>
    </Pane>
  )
}

// A slow hop, so the pending indicator and the skeleton show long enough to measure.
async function SlowLines() {
  await new Promise((resolve) => setTimeout(resolve, 1500))
  return (
    <div className='grid gap-2 p-4'>
      {Array.from({ length: 30 }, (_, at) => (
        <p key={at} className='py-2'>
          slow line {at}
        </p>
      ))}
    </div>
  )
}
