import { CodePreview } from '@/components/CodePreview'

import { querySuggestionsExample } from './example'

export function QuerySuggestions() {
  return (
    <div data-slot='query-suggestions'>
      <CodePreview>{querySuggestionsExample()}</CodePreview>
    </div>
  )
}
