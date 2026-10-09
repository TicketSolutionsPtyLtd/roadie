import { CodePreview } from '@/components/CodePreview'

import { toSearchParams } from '@oztix/roadie-core/records'

import { WEEKEND_VIEW } from './example'

/** The example view on its first page, as `toSearchParams` writes it, one param a line. */
export function ViewSearchParams() {
  const params = [...toSearchParams(WEEKEND_VIEW, { page: 0 })]
  return (
    <div data-slot='view-search-params'>
      <CodePreview>
        {params.map(([key, value]) => `${key}=${value}`).join('\n')}
      </CodePreview>
    </div>
  )
}
