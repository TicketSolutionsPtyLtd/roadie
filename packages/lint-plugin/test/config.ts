// Compiled by `tsc` only: a consumer's typed eslint.config.ts.
import type { Linter } from 'eslint'

import roadie from '@oztix/roadie-lint-plugin'

const config: Linter.Config[] = [
  roadie.configs.recommended,
  ...roadie.configs.testing
]

export default config
