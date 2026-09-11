'use client'

import {
  type MouseEvent,
  type ReactNode,
  createContext,
  use,
  useState
} from 'react'

import {
  type RoadieLinkProps,
  RoadieLinkProvider
} from '@oztix/roadie-components'

const NavigateContext = createContext<(path: string) => void>(() => {})

const isPlainClick = (event: MouseEvent) =>
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey

function DemoLink({ href, onClick, ...props }: RoadieLinkProps) {
  const navigate = use(NavigateContext)
  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented || !isPlainClick(event)) return
        event.preventDefault()
        navigate(href)
      }}
    />
  )
}

type DemoRouterProps = {
  initialPath: string
  onNavigate?: (path: string) => void
  children: (path: string) => ReactNode
}

export function DemoRouter({
  initialPath,
  onNavigate,
  children
}: DemoRouterProps) {
  const [path, setPath] = useState(initialPath)
  const navigate = (next: string) => {
    setPath(next)
    onNavigate?.(next)
  }
  return (
    <RoadieLinkProvider Link={DemoLink}>
      <NavigateContext value={navigate}>{children(path)}</NavigateContext>
    </RoadieLinkProvider>
  )
}
