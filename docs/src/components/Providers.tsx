'use client'

import { ThemeProvider } from '@oztix/roadie-components'

export function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider followSystem>{children}</ThemeProvider>
}
