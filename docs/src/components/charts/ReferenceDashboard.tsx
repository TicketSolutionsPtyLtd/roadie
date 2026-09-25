import type { ReactNode } from 'react'

import { CodePreview } from '@/components/CodePreview'

import { DashboardView } from '@oztix/roadie-charts/dashboard-view'
import type { DashboardCard, DashboardSpec } from '@oztix/roadie-core/dashboard'

export function ReferenceDashboard({
  spec,
  jsx,
  cardActions,
  cardActionsCode
}: {
  spec: DashboardSpec
  jsx: string
  cardActions?: (card: DashboardCard) => ReactNode
  cardActionsCode?: string
}) {
  return (
    <div className='grid gap-8'>
      <DashboardView spec={spec} cardActions={cardActions} />
      <div className='mx-auto grid w-full max-w-[50rem] gap-6'>
        <h2 className='text-display-ui-4 text-strong'>As data</h2>
        <CodePreview language='json'>
          {JSON.stringify(spec, null, 2)}
        </CodePreview>
        {cardActionsCode && (
          <>
            <h2 className='text-display-ui-4 text-strong'>With card actions</h2>
            <CodePreview language='tsx'>{cardActionsCode}</CodePreview>
          </>
        )}
        <h2 className='text-display-ui-4 text-strong'>As JSX</h2>
        <CodePreview language='tsx'>{jsx}</CodePreview>
      </div>
    </div>
  )
}
