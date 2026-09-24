import type {
  ToastManagerAddOptions,
  ToastManagerUpdateOptions,
  ToastObject
} from '@base-ui/react/toast'

import type { ToastIntent } from './variants'

type WithIntent<T> = T & {
  /** Colours the toast and picks its icon. Neutral when unset. */
  intent?: ToastIntent
}

type AnyData = object

export type ToastAddOptions<Data extends object = AnyData> = WithIntent<
  ToastManagerAddOptions<Data>
>

export type ToastUpdateOptions<Data extends object = AnyData> = WithIntent<
  ToastManagerUpdateOptions<Data>
>

type Update<Data extends object> =
  | ToastUpdateOptions<Data>
  | ((previous: ToastObject<Data>) => ToastUpdateOptions<Data>)

type BaseManager = {
  add: (options: ToastManagerAddOptions<AnyData>) => string
  update: (
    id: string,
    options:
      | ToastManagerUpdateOptions<AnyData>
      | ((previous: ToastObject<AnyData>) => ToastManagerUpdateOptions<AnyData>)
  ) => void
}

export type ToastIntentMethods = {
  add: <Data extends object = AnyData>(options: ToastAddOptions<Data>) => string
  update: <Data extends object = AnyData>(
    id: string,
    options: Update<Data>
  ) => void
}

// `intent` is stored as Base UI's `type`, which also carries `loading` and `error`.
function toType<T extends { intent?: ToastIntent; type?: string }>({
  intent,
  ...options
}: T) {
  return intent ? { ...options, type: intent } : options
}

export function withIntent<M extends BaseManager>(
  manager: M
): Omit<M, 'add' | 'update'> & ToastIntentMethods {
  return {
    ...manager,
    add: (options) => manager.add(toType(options)),
    update: <Data extends object>(id: string, options: Update<Data>) =>
      manager.update(
        id,
        typeof options === 'function'
          ? (previous) => toType(options(previous as ToastObject<Data>))
          : toType(options)
      )
  }
}
