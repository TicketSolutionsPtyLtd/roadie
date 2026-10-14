import { classRules } from './classes.js'
import { phosphorRules } from './phosphor.js'

export default {
  meta: { name: '@oztix/eslint-plugin-roadie' },
  rules: { ...phosphorRules, ...classRules }
}
