import { useEffect } from 'react'

import { isDev } from './isDev'

// In an effect, not render: StrictMode double-invokes render. `false` warns nothing.
export function useDevWarning(message: string | false) {
  useEffect(() => {
    if (message && isDev()) console.warn(message)
  }, [message])
}
