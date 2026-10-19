// Writes the records JSON Schemas as files, for servers that generate models
// from them without running JavaScript.
import { writeFileSync } from 'node:fs'

import {
  recordViewJsonSchema,
  recordsRequestJsonSchema
} from '../dist/records/json-schema/index.js'

const write = (name, schema) =>
  writeFileSync(
    new URL(`../dist/records/${name}`, import.meta.url),
    `${JSON.stringify(schema, null, 2)}\n`
  )

write('record-view.schema.json', recordViewJsonSchema())
write('records-request.schema.json', recordsRequestJsonSchema())
