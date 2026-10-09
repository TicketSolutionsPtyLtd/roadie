import { CodePreview } from '@/components/CodePreview'

import { parseQuery } from '@oztix/roadie-core/records'

import {
  EVENT_FIELDS,
  EXAMPLE_NOW,
  EXAMPLE_ZONE,
  callAndResult
} from './example'

const TEXT = 'melb this weekend'

/** What `parseQuery` suggests for some typed text, trimmed to the parts the page explains. */
export function QuerySuggestions() {
  const suggestions = parseQuery(TEXT, {
    fields: EVENT_FIELDS,
    now: new Date(EXAMPLE_NOW),
    timeZone: EXAMPLE_ZONE,
    limit: 4
  }).map(({ kind, label, remainder }) => ({ kind, label, remainder }))
  const call = `parseQuery('${TEXT}', { fields: eventFields, now, timeZone })`
  return (
    <div data-slot='query-suggestions'>
      <CodePreview>{callAndResult(call, suggestions)}</CodePreview>
    </div>
  )
}
