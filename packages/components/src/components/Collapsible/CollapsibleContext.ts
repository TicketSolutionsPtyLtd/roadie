import { createContext, useContext } from 'react'

export const CollapsibleOpenContext = createContext<boolean | null>(null)

export function useCollapsibleOpen(part: string) {
  const open = useContext(CollapsibleOpenContext)
  if (open === null)
    throw new Error(`${part} must be used inside <Collapsible>.`)
  return open
}
