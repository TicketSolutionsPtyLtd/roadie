'use client'

import { type ReactNode, Suspense, lazy, useState } from 'react'

import { type ErrorInfo, catchError } from 'next/error'

import { WarningIcon } from '@phosphor-icons/react'

import { Button } from '@oztix/roadie-components/button'
import { EmptyState } from '@oztix/roadie-components/empty-state'

import type { LiveRunnerProps } from './LiveRunner'

// react-live and the example scope (every component, chart and widget) load
// with the first example that nears the viewport, not with the page.
export const loadLiveRunner = () => import('./LiveRunner')
const LiveRunner = lazy(loadLiveRunner)

type FailedProps = { failed: (reset: () => void) => ReactNode }

const LoadBoundary = catchError(function LiveRunnerFailed(
  { failed }: FailedProps,
  { reset }: ErrorInfo
) {
  return failed(reset)
})

function LiveExampleError({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState intent='danger' size='sm'>
      <EmptyState.IconTile aria-hidden>
        <WarningIcon weight='bold' />
      </EmptyState.IconTile>
      {/* A heading here would join the page's On this page outline. */}
      <EmptyState.Title render={<p />}>
        {"We couldn't load this example"}
      </EmptyState.Title>
      <EmptyState.Description>
        Check your connection and try again.
      </EmptyState.Description>
      <EmptyState.Actions>
        <Button emphasis='strong' onClick={onRetry}>
          Try again
        </Button>
      </EmptyState.Actions>
    </EmptyState>
  )
}

/**
 * LiveRunner once its code loads, with `loading` until then. A failed load
 * shows an error state, wrapped by `frame`, instead of breaking the page.
 */
export function LazyLiveRunner({
  loading,
  frame = (error) => error,
  ...props
}: LiveRunnerProps & {
  loading: ReactNode
  frame?: (error: ReactNode) => ReactNode
}) {
  const [Runner, setRunner] = useState(() => LiveRunner)

  return (
    <LoadBoundary
      failed={(reset) =>
        frame(
          <LiveExampleError
            onRetry={() => {
              // lazy() keeps a rejected load, so a retry needs a fresh one.
              setRunner(() => lazy(loadLiveRunner))
              reset()
            }}
          />
        )
      }
    >
      <Suspense fallback={loading}>
        <Runner {...props} />
      </Suspense>
    </LoadBoundary>
  )
}
