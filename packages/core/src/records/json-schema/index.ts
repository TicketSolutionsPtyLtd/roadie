/**
 * JSON Schemas for a stored view and a server request, generated from the
 * schemas `validateRecordView` uses, so a server in any language can check
 * or generate models from them. Draft-07, which most code generators read.
 * Kept on its own subpath so the records model doesn't carry them.
 */
import { z } from 'zod'

import { recordViewSchema, recordsRequestSchema } from '../schema'

const options = { io: 'input', target: 'draft-07' } as const

/** The JSON Schema of a `RecordView` as stored or sent. */
export function recordViewJsonSchema() {
  return {
    title: 'RecordView',
    ...z.toJSONSchema(recordViewSchema(), options)
  }
}

// The paging pairs, which zod's refinement can't carry into JSON Schema.
const pairs = {
  page: ['pageSize'],
  pageSize: ['page'],
  start: ['end'],
  end: ['start']
}

/** The JSON Schema of a `RecordsRequest`, version 1. */
export function recordsRequestJsonSchema() {
  return {
    title: 'RecordsRequest',
    ...z.toJSONSchema(recordsRequestSchema(), options),
    dependencies: pairs
  }
}
