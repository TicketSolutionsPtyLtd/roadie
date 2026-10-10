import { CodePreview } from '@/components/CodePreview'

import { viewSearchParamsExample } from './example'

export function ViewSearchParams() {
  return (
    <div data-slot='view-search-params'>
      <CodePreview>{viewSearchParamsExample()}</CodePreview>
    </div>
  )
}
