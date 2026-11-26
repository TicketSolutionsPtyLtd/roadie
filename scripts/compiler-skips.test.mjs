// The React Compiler leaves a function it can't compile as written, with no
// warning, so its memoisation goes without a test failing. This runs the
// compiler over every client module of every package that builds with it and
// fails on a skip that isn't listed here with its reason.
import assert from 'node:assert/strict'
import { globSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { isShipped } from '../packages/core/scripts/package-exports.mjs'
import { reactCompilerPreset } from '../packages/core/scripts/react-compiler.config.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const NAMED = /(?:function|const|let)\s+([A-Za-z_$][\w$]*)/
const NO_MEMO = /^use no (?:memo|forget)$/
const MODULE_OPTED_OUT =
  "'use no memo' at the top of the file, which turns the compiler off for all of it"

const OPTED_OUT = "'use no memo', on purpose: "
const HOISTED = 'Compiler todo: a function referenced above its declaration'
const VIRTUAL =
  "TanStack Virtual's useVirtualizer returns functions that can't be memoised safely"

// Rewrite what the compiler names rather than add to this list. An entry that
// compiles again fails too, so the list only gets shorter.
const SKIPS = {
  'components/src/components/Calendar/swipe.ts#useSwipeToTurn':
    '??= and ++ on variables its gesture closures share',
  'components/src/components/Carousel/CarouselRoot.tsx#CarouselRoot': `${OPTED_OUT}it memoises its boundary values by hand`,
  'components/src/components/Collapsible/CollapsibleText.tsx#CollapsibleText':
    'A react-hooks/exhaustive-deps disable turns the compiler off for it',
  'components/src/components/CommandPalette/CommandPaletteRoot.tsx#CommandPaletteRoot':
    HOISTED,
  'components/src/components/FileUpload/FileUploadPageDrop.tsx#FileUploadPageDrop':
    '++ and -- on a module variable',
  'components/src/components/FileUpload/FileUploadRoot.tsx#FileUploadRoot':
    HOISTED,
  'components/src/components/ImageCrop/ImageCropStage.tsx#ImageCropStage':
    '`delete` through an optional chain',
  'components/src/components/Link/RoadieRoutedLink.tsx#RoadieRoutedLink': `${OPTED_OUT}a cache per branch outweighs this small adapter`,
  'components/src/components/Pane/PaneRoot.tsx#PaneRoot': `${OPTED_OUT}it memoises its boundary values by hand`,
  'components/src/components/Records/rowWindow.ts#useRowWindow': VIRTUAL,
  'components/src/pickers/PickerShell.tsx#usePickerLabels':
    'Compiler invariant: "Expected temporaries to be promoted to named identifiers"',
  'components/src/utils/virtualList.tsx#useVirtualListRoot': HOISTED,
  'components/src/utils/virtualRows.tsx#VirtualRows': VIRTUAL,
  'charts/src/plot/ChartPlot.tsx#ChartPlot':
    'Passes a ref to a function during render',
  'editor/src/Editor/EditorBlockHandle.tsx#EditorBlockHandle':
    'Assigns to `editor`, which the compiler holds read-only',
  'editor/src/Editor/EditorEngine.tsx#EditorEngine': 'Reads refs during render'
}

/** Each function the compiler skips under `packages/<name>`, with the compiler's reason. */
async function skipsIn(dir) {
  const { id, code: client } = reactCompilerPreset.rolldown.filter
  // The Babel the build's plugin runs, which only components names itself.
  const require = createRequire(join(dir, 'package.json'))
  const babel = createRequire(require.resolve('@rolldown/plugin-babel'))(
    '@babel/core'
  )
  const skips = new Map()
  for (const file of globSync('src/**/*.{ts,tsx}', { cwd: dir })) {
    const path = join(dir, file)
    // Before the read: a screenshot folder is named after its test file.
    if (!isShipped(file) || !id.test(path)) continue
    const code = readFileSync(path, 'utf8')
    if (!client.test(code)) continue
    const lines = code.split('\n')
    const logEvent = (_, { kind, fnLoc, detail, data, reason }) => {
      if (kind === 'CompileSuccess') return
      // A directive's skip is reported at the function's body, below the name.
      let line = fnLoc?.start.line ?? 0
      while (line > 1 && !NAMED.test(lines[line - 1])) line--
      const name = NAMED.exec(lines[line - 1])?.[1] ?? `line ${line}`
      skips.set(
        `${basename(dir)}/${file}#${name}`,
        detail?.options?.reason ?? detail?.reason ?? data ?? reason
      )
    }
    const { ast } = babel.transformSync(code, {
      filename: path,
      babelrc: false,
      configFile: false,
      code: false,
      ast: true,
      parserOpts: {
        plugins: file.endsWith('x') ? ['typescript', 'jsx'] : ['typescript']
      },
      plugins: reactCompilerPreset
        .preset()
        .plugins.map(([plugin, options]) => [
          require.resolve(plugin),
          { ...options, logger: { logEvent } }
        ])
    })
    // Under one for the module, the compiler reports each function a success
    // and leaves them all as written.
    if (ast.program.directives.some(({ value }) => NO_MEMO.test(value.value)))
      skips.set(`${basename(dir)}/${file}`, MODULE_OPTED_OUT)
  }
  return [...skips]
}

describe('React Compiler', () => {
  it('skips only the functions listed with a reason', async () => {
    const compiled = globSync('packages/*/tsdown.config.ts', { cwd: root })
      .filter((config) =>
        readFileSync(join(root, config), 'utf8').includes('reactCompilerPreset')
      )
      .map((config) => join(root, dirname(config)))
    assert.ok(compiled.length >= 4, 'finds the packages that compile')
    const skips = new Map()
    for (const dir of compiled)
      for (const [skip, reason] of await skipsIn(dir)) skips.set(skip, reason)
    assert.deepEqual(
      [...skips].filter(([skip]) => !(skip in SKIPS)),
      [],
      'Skipped with no entry in SKIPS. Rewrite what the compiler names, or list the function with its reason.'
    )
    assert.deepEqual(
      Object.keys(SKIPS).filter((skip) => !skips.has(skip)),
      [],
      'Listed in SKIPS but compiles now. Take it off the list.'
    )
  })
})
