import { CodePreview } from '@/components/CodePreview'

import { viewMeilisearchExample } from './example'

export function ViewMeilisearch() {
  return (
    <div data-slot='view-meilisearch'>
      <CodePreview>{viewMeilisearchExample()}</CodePreview>
    </div>
  )
}
