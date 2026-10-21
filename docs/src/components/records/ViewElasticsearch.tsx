import { CodePreview } from '@/components/CodePreview'

import { viewElasticsearchExample } from './example'

export function ViewElasticsearch() {
  return (
    <div data-slot='view-elasticsearch'>
      <CodePreview language='ts'>{viewElasticsearchExample()}</CodePreview>
    </div>
  )
}
