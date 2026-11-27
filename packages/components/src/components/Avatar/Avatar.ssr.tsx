import { Avatar } from '.'
import { allowing } from '../../utils/hydrationTestUtils'

const pixel =
  'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='
const swapped = { ticket: 'INNO-1702', shift: 0, removed: 1 }

export const ImageAndInitials = allowing(
  () => (
    <p className='flex gap-2'>
      <Avatar name='Mia Tran' />
      <Avatar src={pixel} name='Mia Tran' />
    </p>
  ),
  { 390: swapped, 1280: swapped }
)
