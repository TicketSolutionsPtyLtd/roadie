import { useEffect, useRef } from 'react'

import { isDev } from './isDev'

// In an effect, not render: StrictMode double-invokes render. Its replayed
// mount keeps refs, so the ref stops a second warning. `false` warns nothing.
export function useDevWarning(message: string | false) {
  const warned = useRef('')
  useEffect(() => {
    if (message && message !== warned.current && isDev()) {
      console.warn((warned.current = message))
    }
  }, [message])
}
