import { Pane, Skeleton } from '@oztix/roadie-components'

// `pending` keeps the frame's indicator up while the skeletons stand in.
export default function SlowLoading() {
  return (
    <Pane pending data-testid='slow-loading'>
      <Pane.Header>
        <Pane.Title>Slow</Pane.Title>
      </Pane.Header>
      <div className='grid gap-3 p-4'>
        {Array.from({ length: 12 }, (_, at) => (
          <div key={at} className='grid gap-2'>
            <Skeleton className='w-2/3' />
            <Skeleton />
            <Skeleton className='w-1/2' />
          </div>
        ))}
      </div>
    </Pane>
  )
}
