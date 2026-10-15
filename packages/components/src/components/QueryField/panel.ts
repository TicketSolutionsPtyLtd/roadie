import { type ReactNode, createContext } from 'react'

/**
 * Prototype (INNO-1278), not public: content the dropdown shows in place of
 * its list, with a Back control, such as Custom dates' calendar on a phone.
 * It goes, or becomes a prop, once the phone surface is picked.
 */
export type QueryFieldPanel = {
  content: ReactNode
  /** Back, Escape, or a press outside left the panel. */
  onBack: () => void
}

export const QueryFieldPanelContext = createContext<QueryFieldPanel | null>(
  null
)
