import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { devOnly } from './dev-only.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { transformSync } = createRequire(
  join(root, 'packages/components/package.json')
)('@babel/core')

const build = (code) =>
  transformSync(code, {
    babelrc: false,
    configFile: false,
    plugins: [devOnly]
  }).code

const DEV = 'process.env.NODE_ENV !== "production"'

describe('devOnly', () => {
  const cases = [
    {
      name: 'guards a top-level displayName',
      code: `const Root = () => null;\nRoot.displayName = 'Card.Root';`,
      out: `const Root = () => null;\nif (${DEV}) Root.displayName = 'Card.Root';`
    },
    {
      name: 'leaves a displayName set inside a function',
      code: `function make(name) {\n  C.displayName = name;\n}`,
      out: `function make(name) {\n  C.displayName = name;\n}`
    },
    {
      name: 'inlines an imported isDev() so bundlers can drop the branch',
      code: `import { isDev } from './isDev';\nif (isDev()) console.warn('x');`,
      out: `import { isDev } from './isDev';\nif (${DEV}) console.warn('x');`
    },
    {
      name: 'leaves a local isDev alone',
      code: `const isDev = () => true;\nisDev();`,
      out: `const isDev = () => true;\nisDev();`
    },
    {
      name: "guards useDevWarning's message, so the text drops out too",
      code: `import { useDevWarning } from './useDevWarning';\nuseDevWarning(a || b && 'm');`,
      out: `import { useDevWarning } from './useDevWarning';\nuseDevWarning(${DEV} && (a || b && 'm'));`
    }
  ]
  for (const { name, code, out } of cases)
    it(name, () => assert.equal(build(code), out))

  it('guards each once', () => {
    const once = build(
      `import { useDevWarning } from './u';\nX.displayName = 'X';\nuseDevWarning(m);`
    )
    assert.equal(build(once), once)
  })
})
