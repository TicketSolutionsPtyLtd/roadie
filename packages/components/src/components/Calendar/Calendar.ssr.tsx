import { Calendar } from '.'
import { allowing } from '../../utils/hydrationTestUtils'

const noClock = { ticket: 'INNO-1689', shift: 44 }

// Six weeks, as the server's placeholder is, so every month shifts alike.
export const NoToday = allowing(
  () => <Calendar selected={null} onSelect={() => {}} fixedWeeks />,
  { 390: noClock, 1280: noClock }
)
