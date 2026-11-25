import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { rolldown } from 'rolldown'

import { devOnly, devOnlyPreset } from './dev-only.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromComponents = createRequire(
  join(root, 'packages/components/package.json')
)
const { transformSync } = requireFromComponents('@babel/core')
const reactCompiler = requireFromComponents('babel-plugin-react-compiler')

// The package build: dev-only, then the React Compiler, in the tsdown configs' order.
const buildPackage = (code) =>
  transformSync(code, {
    babelrc: false,
    configFile: false,
    filename: 'Component.js',
    presets: [
      devOnlyPreset.preset,
      () => ({ plugins: [[reactCompiler, { target: '19' }]] })
    ]
  }).code

// An app's production bundle of that output.
async function buildApp(code) {
  const bundle = await rolldown({
    input: 'entry',
    external: () => true,
    plugins: [
      {
        name: 'entry',
        resolveId: (id) => (id === 'entry' ? id : null),
        load: (id) => (id === 'entry' ? code : null)
      }
    ],
    transform: { define: { 'process.env.NODE_ENV': '"production"' } }
  })
  const { output } = await bundle.generate({ format: 'esm', minify: true })
  return output[0].code
}

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

  // The React Compiler memoizes a warning's argument with its callee, as in
  // RecordsRoot and RoadieProvider, so the call it leaves isn't useDevWarning.
  it("drops a warning the React Compiler memoizes from an app's bundle", async () => {
    const shipped = await buildApp(
      buildPackage(`import { useDevWarning } from './useDevWarning';
export function Records({ layouts }) {
  const types = layouts.map(({ type }) => type);
  useDevWarning(new Set(types).size < types.length && \`DEV ONLY \${types.join(', ')}\`);
  return null;
}`)
    )
    assert.doesNotMatch(shipped, /DEV ONLY/)
  })
})
