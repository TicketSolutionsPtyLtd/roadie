import { CodePreview } from '@/components/CodePreview'

import { toMeilisearch } from '@oztix/roadie-core/records/meilisearch'

import {
  EVENT_FIELDS,
  EXAMPLE_NOW,
  EXAMPLE_NOW_LABEL,
  EXAMPLE_ZONE,
  WEEKEND_VIEW,
  callAndResult
} from './example'

/** The example view as Meilisearch parameters, worked out by `toMeilisearch`. */
export function ViewMeilisearch() {
  const params = toMeilisearch(WEEKEND_VIEW, EVENT_FIELDS, {
    now: new Date(EXAMPLE_NOW),
    timeZone: EXAMPLE_ZONE
  })
  const call = `toMeilisearch(view, eventFields, {
  now: new Date('${EXAMPLE_NOW}'), // ${EXAMPLE_NOW_LABEL}
  timeZone: '${EXAMPLE_ZONE}'
})`
  return (
    <div data-slot='view-meilisearch'>
      <CodePreview>{callAndResult(call, params)}</CodePreview>
    </div>
  )
}
