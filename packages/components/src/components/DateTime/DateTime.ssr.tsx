import { DateTime } from '.'
import { allowing } from '../../utils/hydrationTestUtils'

const timeZone = 'Australia/Brisbane'
const noClock = { ticket: 'INNO-1689', shift: 47 }

// Today, so the year a standalone date drops is always this one.
export const DefaultAndStandalone = allowing(
  () => (
    <p className='inline-flex gap-4'>
      <DateTime at={new Date()} timeZone={timeZone} />
      <DateTime at={new Date()} timeZone={timeZone} context='standalone' />
    </p>
  ),
  { 390: noClock, 1280: noClock }
)
