import { useState } from 'react'

import { DateTime } from '.'

const timeZone = 'Australia/Brisbane'

// Today, so the year a standalone date drops is always this one.
export const DefaultAndStandalone = function DefaultAndStandalone() {
  const [today] = useState(() => new Date())
  return (
    <p className='inline-flex gap-4'>
      <DateTime at={today} timeZone={timeZone} />
      <DateTime at={today} timeZone={timeZone} context='standalone' />
    </p>
  )
}
