import type { Ref, RefCallback } from 'react'

export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  return (node) => {
    const cleanups = refs.map((ref) => {
      if (typeof ref === 'function') {
        const cleanup = ref(node)
        return typeof cleanup === 'function' ? cleanup : () => ref(null)
      }
      if (ref) {
        ref.current = node
        return () => {
          ref.current = null
        }
      }
    })
    return () => cleanups.forEach((cleanup) => cleanup?.())
  }
}
