import { useState } from 'react'

import { Countdown } from '.'

export const EightMinutesInline = function EightMinutes() {
  const [until] = useState(() => new Date(Date.now() + 8 * 60_000))
  return (
    <p className='inline-flex gap-4'>
      Sale ends in <Countdown until={until} />
    </p>
  )
}
