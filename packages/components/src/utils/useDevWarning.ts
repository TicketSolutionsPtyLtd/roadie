import { useEffect, useRef } from 'react'

import { isDev } from './isDev'

// An effect, as StrictMode double-invokes render; the ref survives the replayed mount.
export function useDevWarning(message: string | false) {
  const warned = useRef('')
  useEffect(() => {
    if (message && message !== warned.current && isDev()) {
      console.warn((warned.current = message))
    }
  }, [message])
}
