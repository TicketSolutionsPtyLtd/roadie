import { Kbd } from '.'

export const ModShortcuts = () => (
  <p className='inline-flex gap-4'>
    <Kbd keys={['mod', 'k']} />
    <Kbd keys={['mod', 'shift', 'p']} />
  </p>
)
