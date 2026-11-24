import { useState } from 'react'

import { Countdown } from '.'
import { allowing } from '../../utils/hydrationTestUtils'

const noClock = { ticket: 'INNO-1667', shift: 97 }

export const EightMinutesInline = allowing(
  function EightMinutes() {
    const [until] = useState(() => new Date(Date.now() + 8 * 60_000))
    return (
      <p className='inline-flex gap-4'>
        Sale ends in <Countdown until={until} />
      </p>
    )
  },
  { 390: noClock, 1280: noClock }
)
