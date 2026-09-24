// No 'use client': dot access must work from server components.
import { SwitchRoot } from './SwitchRoot'
import { SwitchThumb } from './SwitchThumb'

const Switch = SwitchRoot as typeof SwitchRoot & {
  Root: typeof SwitchRoot
  Thumb: typeof SwitchThumb
}

Switch.Root = SwitchRoot
Switch.Thumb = SwitchThumb

export { Switch }
export type {
  SwitchRootProps as SwitchProps,
  SwitchRootProps,
  SwitchSize
} from './SwitchRoot'
export type { SwitchThumbProps } from './SwitchThumb'
export { switchThumbVariants, switchVariants } from './variants'
