import { CodePreview } from '@/components/CodePreview'

import { DashboardView } from '@oztix/roadie-charts/dashboard-view'
import type { DashboardSpec } from '@oztix/roadie-core/dashboard'

export function ReferenceDashboard({
  spec,
  jsx
}: {
  spec: DashboardSpec
  jsx: string
}) {
  return (
    <div className='grid gap-8'>
      <DashboardView spec={spec} />
      <div className='mx-auto grid w-full max-w-[50rem] gap-6'>
        <h2 className='text-display-ui-4 text-strong'>As data</h2>
        <CodePreview language='json'>
          {JSON.stringify(spec, null, 2)}
        </CodePreview>
        <h2 className='text-display-ui-4 text-strong'>As JSX</h2>
        <CodePreview language='tsx'>{jsx}</CodePreview>
      </div>
    </div>
  )
}
