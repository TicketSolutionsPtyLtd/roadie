import { cn } from '@oztix/roadie-core/utils'

type StateClassName<State> =
  string | ((state: State) => string | undefined) | undefined

/** `cn` for Base UI's `className`, keeping a state callback a callback. */
export function mergeClassName<State>(
  base: string,
  className: StateClassName<State>
): StateClassName<State> {
  if (typeof className === 'function') {
    return (state) => cn(base, className(state))
  }
  return cn(base, className)
}
