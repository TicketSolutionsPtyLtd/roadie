import { Calendar } from '.'
import { allowing } from '../../utils/hydrationTestUtils'

const noClock = { ticket: 'INNO-1689', shift: 44 }

export const NoToday = allowing(
  () => <Calendar selected={null} onSelect={() => {}} />,
  { 390: noClock, 1280: noClock }
)
