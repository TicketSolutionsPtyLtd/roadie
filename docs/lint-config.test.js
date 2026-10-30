// docs/oxlint.config.ts and docs/eslint.config.js, tested here so a change to
// either runs these in CI, where --affected picks packages by changed files.
import { ESLint } from 'eslint'
import { spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'

import roadie from '../eslint/roadie-plugin.js'

const SLEEP =
  'export const settle = (ms: number) =>\n  new Promise((resolve) => setTimeout(resolve, ms))\n'

// Oxlint lints only files on disk, so the seeds go in a scratch docs/ beside
// a link to eslint/, where the config's jsPlugins path points. Returns each
// seed's rule IDs.
function lintSeeds(seeds) {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const scratch = mkdtempSync(join(tmpdir(), 'roadie-docs-oxlint-'))
  try {
    const docs = join(scratch, 'docs')
    mkdirSync(docs)
    writeFileSync(
      join(docs, 'oxlint.config.ts'),
      `export { default } from '${pathToFileURL(join(root, 'docs/oxlint.config.ts'))}'\n`
    )
    // A junction links a folder on Windows without admin rights.
    symlinkSync(join(root, 'eslint'), join(scratch, 'eslint'), 'junction')
    for (const [path, source] of seeds) {
      mkdirSync(dirname(join(docs, path)), { recursive: true })
      writeFileSync(join(docs, path), source)
    }
    // Node runs oxlint's script itself, since Windows can't run the .bin shim.
    const { stdout, stderr } = spawnSync(
      process.execPath,
      [
        join(root, 'node_modules/oxlint/bin/oxlint'),
        '-f',
        'json',
        ...seeds.map(([path]) => path)
      ],
      { cwd: docs, encoding: 'utf8' }
    )
    if (!stdout) throw new Error(stderr)
    const found = new Map(seeds.map(([path]) => [path, []]))
    for (const { filename, code } of JSON.parse(stdout).diagnostics) {
      found.get(filename.replaceAll('\\', '/')).push(code)
    }
    return found
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}

describe('where no-fixed-sleep applies in docs/oxlint.config.ts', () => {
  const PATHS = [
    'src/components/OnThisPage.test.tsx',
    'e2e/live-examples.e2e.test.ts',
    'e2e/serveExport.ts',
    'src/components/landOn.ts'
  ]
  let found

  beforeAll(() => {
    found = lintSeeds(PATHS.map((path) => [path, SLEEP]))
  }, 60_000)

  it.each([
    [PATHS[0], 1],
    [PATHS[1], 1],
    [PATHS[2], 1],
    [PATHS[3], 0]
  ])('%s: %i', (path, count) => {
    expect(
      found.get(path).filter((code) => code === 'roadie(no-fixed-sleep)')
    ).toHaveLength(count)
  })
})

it("applies Roadie's recommended rules to the docs app's code", () => {
  const path = 'src/components/Seed.tsx'
  const seed =
    "export const Seed = () => <div className='dark:bg-normal z-[5]' />\n"
  expect(
    lintSeeds([[path, seed]])
      .get(path)
      .sort()
  ).toEqual([
    'roadie(canonical-class)',
    'roadie(no-arbitrary-z-index)',
    'roadie(no-dark-variant)'
  ])
}, 60_000)

describe('docs/eslint.config.js on MDX', () => {
  const docs = fileURLToPath(new URL('.', import.meta.url))
  const docsLinter = (...overrides) =>
    new ESLint({ cwd: docs, overrideConfig: overrides })
  const eslint = docsLinter()
  // Reaches fences past the config's glob, leaving only the rule's own guard.
  // The docs config loads its own copy of the plugin, so this one needs
  // another name.
  const guardOnly = docsLinter({
    files: ['**/*.mdx/**'],
    plugins: { guarded: roadie },
    rules: {
      'guarded/no-mdx-layout-class': 'error',
      'guarded/no-dark-variant': 'error'
    }
  })

  // A class in a fence makes roadie/canonical-class load Tailwind's design
  // system here, not in the first test.
  beforeAll(
    () =>
      Promise.all(
        [eslint, guardOnly].map((linter) =>
          linter.lintText("```tsx-live\n<div className='p-4' />\n```\n", {
            filePath: 'src/app/sample/page.mdx'
          })
        )
      ),
    60_000
  )

  const mdxHits = async (body, ruleId, linter = eslint) => {
    const [result] = await linter.lintText(
      `import { Guideline } from '@/components/Guideline'\n\n${body}\n`,
      { filePath: 'src/app/sample/page.mdx' }
    )
    return result.messages.filter((message) => message.ruleId === ruleId)
  }

  const layoutHits = (body) => mdxHits(body, 'roadie/no-mdx-layout-class')

  const fence = (lang) =>
    `\`\`\`${lang}\n<div className='grid gap-4 dark:bg-normal'>\n  <Button>Buy tickets</Button>\n</div>\n\`\`\``

  const fenceLangs = ['tsx-live', 'tsx-live-prose', 'mdx']

  it.each([
    'tsx-live',
    'tsx-live-prose',
    'tsx-live-noinline-expand',
    'jsx-live'
  ])('fails a dark: variant in a %s fence', async (lang) => {
    expect(await mdxHits(fence(lang), 'roadie/no-dark-variant')).toHaveLength(1)
  })

  it('fails a raw hex colour in a tsx-live fence', async () => {
    const hexFence =
      "```tsx-live\n<Badge className='bg-[#ff0000]'>New</Badge>\n```"
    expect(await mdxHits(hexFence, 'roadie/no-hex-colour-class')).toHaveLength(
      1
    )
  })

  it.each([
    ['<HeartIcon size={16} />', 'roadie/phosphor-icon-size-prop'],
    ['<HeartIcon />', 'roadie/phosphor-icon-weight']
  ])(
    'fails %s in a tsx-live fence, with icons from scope',
    async (icon, ruleId) => {
      expect(
        await mdxHits(`\`\`\`tsx-live\n${icon}\n\`\`\``, ruleId)
      ).toHaveLength(1)
    }
  )

  it('fails a bare icon name a tsx-live fence gets from scope', async () => {
    const bareScope = docsLinter({
      files: ['**/*.mdx/*.{tsx,jsx}'],
      settings: { roadie: { phosphorIcons: ['Heart'] } }
    })
    expect(
      await mdxHits(
        "```tsx-live\n<Heart weight='bold' />\n```",
        'roadie/phosphor-icon-suffix',
        bareScope
      )
    ).toHaveLength(1)
  })

  it('serves tsx-live fences only Icon-suffixed icons', async () => {
    const { settings } = await eslint.calculateConfigForFile(
      'src/app/sample/page.mdx/0.tsx'
    )
    expect(settings.roadie.phosphorIcons).toContain('HeartIcon')
    expect(
      settings.roadie.phosphorIcons.filter((name) => !name.endsWith('Icon'))
    ).toEqual([])
  })

  it('lints sibling elements in an inline fence, at their own columns', async () => {
    const siblings =
      "```tsx-live layout=row\n<Badge className='dark:bg-normal'>One</Badge>\n<Badge>Two</Badge>\n```"
    const [result] = await eslint.lintText(siblings, {
      filePath: 'src/app/sample/page.mdx'
    })
    expect(result.messages).toMatchObject([
      { ruleId: 'roadie/no-dark-variant', line: 2, column: 18 }
    ])
  })

  it('fails a layout wrapper in a fence on a migrated page only', async () => {
    const wrapped =
      "```tsx-live\n<div className='flex flex-wrap gap-2'>\n  <Badge>New</Badge>\n</div>\n```\n"
    const hits = async (filePath) => {
      const [result] = await eslint.lintText(wrapped, { filePath })
      return result.messages.map(({ ruleId }) => ruleId)
    }
    expect(await hits('src/app/components/badge/page.mdx')).toEqual([
      'roadie/no-fence-layout-wrapper'
    ])
    expect(await hits('src/app/sample/page.mdx')).toEqual([])
  })

  it('leaves bare Image as the Roadie component in a tsx-live fence', async () => {
    const imageFence = "```tsx-live\n<Image src='/a.png' alt='' />\n```"
    expect(await mdxHits(imageFence, 'roadie/phosphor-icon-weight')).toEqual([])
  })

  it('leaves plain tsx fragments unlinted', async () => {
    expect(await mdxHits(fence('tsx'), 'roadie/no-dark-variant')).toEqual([])
  })

  it.each(['0.tsx', '0.mdx'])(
    'leaves the rule off for fence page.mdx/%s in the config',
    async (block) => {
      const { rules } = await eslint.calculateConfigForFile(
        `src/app/sample/page.mdx/${block}`
      )
      const pageConfig = await eslint.calculateConfigForFile(
        'src/app/sample/page.mdx'
      )
      expect(pageConfig.rules).toHaveProperty('roadie/no-mdx-layout-class')
      expect(rules).not.toHaveProperty('roadie/no-mdx-layout-class')
    }
  )

  it.each(fenceLangs)('skips %s fences in the rule itself', async (lang) => {
    expect(
      await mdxHits(fence(lang), 'guarded/no-dark-variant', guardOnly)
    ).toHaveLength(1)
    expect(
      await mdxHits(fence(lang), 'guarded/no-mdx-layout-class', guardOnly)
    ).toEqual([])
  })

  it.each([
    "<p className='text-display-ui-6 text-subtle'>Doors open at 7pm</p>",
    ...fenceLangs.map(fence),
    "<Guideline.Do code={`<div className='grid gap-4'>…</div>`}>\n  Stack the tiers.\n</Guideline.Do>",
    '<Guideline title="Show the price">\n  Show the total.\n</Guideline>'
  ])('allows %s', async (body) => {
    expect(await layoutHits(body)).toEqual([])
  })

  it.each([
    ["<div className='grid gap-8'>\n\nText\n\n</div>", ['grid', 'gap-8']],
    [
      "<Guideline.Do example={<span className='w-56'>Ochre Kite</span>}>\n  Keep it short.\n</Guideline.Do>",
      ['w-56']
    ]
  ])('flags %s', async (body, tokens) => {
    const hits = await layoutHits(body)
    expect(hits.map((hit) => hit.message.match(/not (\S+)\./)[1])).toEqual(
      tokens
    )
  })
})
