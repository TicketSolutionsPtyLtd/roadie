import { Kbd } from '.'
import { allowing } from '../../utils/hydrationTestUtils'

const noPlatform = { ticket: 'INNO-1689', shift: 34 }

export const ModShortcuts = allowing(
  () => (
    <p className='inline-flex gap-4'>
      <Kbd keys={['mod', 'k']} />
      <Kbd keys={['mod', 'shift', 'p']} />
    </p>
  ),
  { 390: noPlatform, 1280: noPlatform }
)
