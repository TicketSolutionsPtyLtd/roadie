import typescriptParser from '@typescript-eslint/parser'
import { ESLint, RuleTester } from 'eslint'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'

import roadie from './roadie-plugin.js'

RuleTester.describe = describe
RuleTester.it = it
RuleTester.itOnly = it.only

const tester = new RuleTester({
  languageOptions: {
    parser: typescriptParser,
    parserOptions: { ecmaFeatures: { jsx: true } }
  }
})

const cases = {
  'phosphor-icon-suffix': {
    valid: [
      "import { HeartIcon, IconContext } from '@phosphor-icons/react'",
      "import type { Icon } from '@phosphor-icons/react'",
      "import { Heart } from 'somewhere-else'"
    ],
    invalid: [
      "import { Heart } from '@phosphor-icons/react'",
      "import { Heart as HeartIcon } from '@phosphor-icons/react/ssr'"
    ]
  },
  'phosphor-icon-size-prop': {
    valid: [
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon className='size-4' />",
      "import { StarIcon } from '@phosphor-icons/react'; <svg><StarIcon size='100%' /></svg>",
      '<Avatar size="sm" />'
    ],
    invalid: [
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon size={16} />"
    ]
  },
  'phosphor-icon-weight': {
    valid: [
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon weight='bold' />",
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon weight='fill' />",
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon weight={selected ? 'fill' : 'bold'} />",
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon weight={iconWeight} />",
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon {...iconProps} />",
      "import { HeartIcon } from '@phosphor-icons/react'; <Navigator.Item icon={<HeartIcon />} />"
    ],
    invalid: [
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon weight='regular' />",
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon weight={'regular'} />",
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon weight={`thin`} />",
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon weight={selected ? 'fill' : 'regular'} />",
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon weight={iconWeight ?? 'thin'} />",
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon />",
      "import { HeartIcon } from '@phosphor-icons/react'; <Navigator.MenuItem icon={<HeartIcon />} />"
    ]
  },
  'no-dark-variant': {
    valid: ["<div className='dark bg-normal' />"],
    invalid: [
      "<div className='bg-normal dark:bg-strong' />",
      "cn('p-2', isOpen && 'hover:dark:text-strong')",
      "<div className={cn('dark:bg-strong')} />"
    ]
  },
  'no-hex-colour-class': {
    valid: ["<div className='bg-normal' />", "const id = '#main'"],
    invalid: [
      "<div className='bg-[#fff]' />",
      'cva(`text-[#1a2b3c]`, { variants: {} })'
    ]
  },
  'no-arbitrary-z-index': {
    valid: ["<div className='z-popover' />", "<div className='z-1' />"],
    invalid: ["<div className='relative z-[5]' />", "cn('md:-z-[2]')"]
  },
  'no-arbitrary-radius': {
    valid: [
      "<div className='rounded-xl' />",
      "<div className='rounded-[inherit]' />"
    ],
    invalid: [
      "<div className='rounded-[10px]' />",
      "cn({ 'rounded-tl-[4px]': open })"
    ]
  },
  'no-mdx-layout-class': {
    valid: [
      { code: "<div className='grid gap-8' />", filename: 'page.mdx/0.tsx' },
      { code: "<p className='text-display-ui-4' />", filename: 'page.mdx' }
    ],
    invalid: [
      {
        code: "<div className='grid gap-8' />",
        filename: 'page.mdx',
        errors: 2
      },
      { code: "<span className='md:max-w-56' />", filename: 'page.mdx' },
      {
        code: "<div className='md:grid! relative!' />",
        filename: 'page.mdx',
        errors: 2
      },
      {
        code: "<div className={cn(`shrink-0 ${open && 'basis-1/2'}`)} />",
        filename: 'page.mdx',
        errors: 2
      }
    ]
  },
  'no-fence-layout-wrapper': {
    valid: [
      '<Badge>New</Badge>',
      '<>\n<Badge>One</Badge>\n<Badge>Two</Badge>\n</>',
      // Fence options can't reproduce these classes, so the wrapper stays.
      "<div className='grid justify-items-start gap-4'><Button /></div>",
      "<div className='grid gap-4 rounded-2xl bg-subtle p-4'><Button /></div>",
      "<div className='flex flex-col gap-4'><Button /></div>",
      "<div className='grid gap-4 sm:grid-cols-2'><Button /></div>",
      "<div className='grid gap-[6px]'><Button /></div>",
      "<div className={cn('grid gap-4')}><Button /></div>",
      "<section className='grid gap-4'><Button /></section>",
      // A non-root wrapper
      "<Card><div className='grid gap-2'><Button /></div></Card>",
      "render(<div className='grid gap-4'><Button /></div>)",
      // A wrapper with other props
      "<div className='grid gap-4' role='group'><Button /></div>",
      "<div className='grid gap-4' style={{ minHeight: 200 }}><Button /></div>",
      "<div className='grid gap-4' {...props}><Button /></div>"
    ],
    invalid: [
      // layout=stack, and with gap=
      "<div className='grid gap-4'><Button /><Button /></div>",
      "<div className='grid gap-8'><Button /><Button /></div>",
      // layout=row, and with gap=
      "<div className='flex flex-row flex-wrap gap-2'><Badge /></div>",
      "<div className='flex flex-wrap items-center gap-3'><Badge /></div>",
      // width=
      "<div className='w-140 max-w-full'><Chart /></div>",
      "<div className='w-72'><StatTile /></div>",
      "<div className='max-w-64'><Input /></div>",
      "<div className='grid max-w-48 gap-4'><NumberField /></div>",
      // A root sibling in a laid-out fence, which lints inside a fragment
      "<>\n<div className='grid gap-2'><Button /></div>\n<Button />\n</>",
      // Captions, directly or one cell down
      {
        code: "<>\n<div className='grid gap-1'><p className='text-sm text-subtle'>Normal</p><Accordion /></div>\n</>",
        errors: [{ message: /state label/ }]
      },
      {
        code: "<div className='grid gap-4'><div className='grid gap-1'><p className='text-sm text-subtle'>Separate</p><Kbd /></div></div>",
        errors: [{ message: /state label/ }]
      }
    ]
  },
  'no-import-meta-env': {
    valid: ["const dev = process.env.NODE_ENV !== 'production'"],
    invalid: ['const dev = import.meta.env.DEV']
  },
  'no-dynamic-next-import': {
    valid: ["import('./lazy')", "import('next-intl')"],
    invalid: ["import('next/navigation')", "import('next')"]
  },
  'no-dynamic-next-link': {
    valid: ["import('next/navigation')", "import('./link')"],
    invalid: ["import('next/link')"]
  },
  'no-dynamic-zod-import': {
    valid: ["import('./schema-types')", "import('zod-to-json')"],
    invalid: ["import('zod')", "import('./schema')"]
  },
  'no-fixed-sleep': {
    valid: [
      'await new Promise((resolve) => setTimeout(resolve, 0))',
      'await new Promise((resolve) => setTimeout(resolve))',
      'await expect.poll(() => value).toBe(1)',
      // Timers that aren't awaited as a sleep.
      'const timer = setTimeout(() => setTall(true), delay)',
      'const echo = () => setTimeout(() => setPosition(next), 400)',
      'const debounce = (fn, ms) => {\n  let timer\n  return (value) => {\n    clearTimeout(timer)\n    timer = setTimeout(() => fn(value), ms)\n  }\n}\nvi.useFakeTimers()\ndebounce(onSearch, 300)("a")\nvi.advanceTimersByTime(300)',
      'vi.advanceTimersByTime(ms)'
    ],
    invalid: [
      'await new Promise((resolve) => setTimeout(resolve, 100))',
      'await page.waitForTimeout(50)',
      "await userEvent.pointer([{ type: 'wait', ms: 20 }])",
      'await new Promise((resolve) => setTimeout(resolve, ms))',
      'await new Promise((resolve) => window.setTimeout(resolve, delay * 2))',
      'await new Promise((resolve) => setTimeout(() => resolve(), DELAY))',
      // Only the sleep: a function that does more than sleep isn't a helper.
      {
        code: 'async function mount(ms) {\n  render()\n  await new Promise((resolve) => setTimeout(resolve, ms))\n}\nawait mount(10)',
        errors: 1
      },
      {
        code: 'const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))\nawait wait(700)\nawait wait(300)',
        errors: 3
      },
      {
        code: 'const wait = (ms: number) =>\n  withFrames(() => new Promise((resolve) => setTimeout(resolve, ms)))\nit("waits", async () => {\n  await wait(700)\n})',
        errors: 2
      },
      {
        code: 'await sleep(50)\nfunction sleep(ms) {\n  return new Promise((resolve) => setTimeout(resolve, ms))\n}',
        errors: 2
      },
      {
        code: 'async function sleep(ms) {\n  await new Promise((resolve) => setTimeout(resolve, ms))\n}\nawait sleep(50)',
        errors: 2
      }
    ]
  },
  'no-css-source-in-jsdom': {
    valid: ["readFileSync('./data.json', 'utf8')"],
    invalid: [
      "import css from './button.css?raw'",
      "fs.readFileSync(new URL('./roadie.css', import.meta.url), 'utf8')"
    ]
  },
  'no-css-class-in-jsdom': {
    valid: ["expect(el).toHaveClass('emphasis-strong')"],
    invalid: [
      "expect(el).toHaveClass('w-[calc(100%-1rem)]')",
      "expect(el).toHaveClass('max-lg:hidden')",
      "expect(el).toHaveClass('sm:end-6')",
      "expect(el).toHaveClass('hidden', 'md:inline-block')",
      "expect(el).toHaveClass('max-2xl:absolute')"
    ]
  },
  'no-cva-output-assertion': {
    valid: [
      "expect(screen.getByRole('button')).toHaveClass('intent-accent')",
      "render(<div className={paneVariants()} />)\nexpect(screen.getByRole('region')).toHaveClass('emphasis-raised')",
      'const html = `<section class="${paneVariants()}"></section>`\ncontainer.innerHTML = html\nexpect(container.firstChild).toBeVisible()',
      'const html = `<section class="${paneVariants()}"></section>`\nconst host = mount(html)\nexpect(getComputedStyle(host).position).toBe(\'relative\')',
      'const classes = buttonVariants()\nrender(<button className={classes} />)',
      "const variants = buttonVariants\nexpect(variants).toBeTypeOf('function')",
      "render(<div className={buttonVariants().split(' ')[0]} />)\nexpect(screen.getByRole('button')).toHaveClass('is-interactive')",
      "render(<div className={cn(buttonVariants(), 'p-1')} />)",
      "const classes = [navVariants(), 'p-1'].join(' ')\nrender(<nav className={classes} />)",
      'for (const track of [trackVariants()]) {\n  render(<div className={track} />)\n}',
      "const { container } = render(<div className={buttonVariants()} />)\nexpect(container.firstChild).toHaveClass('emphasis-strong')",
      'expect(Button).toBe(Button.Root)'
    ],
    invalid: [
      "expect(buttonVariants({ intent: 'accent' })).toContain('intent-accent')",
      "expect(buttonVariants().split(' ')).toContain('is-interactive')",
      "expect(classesOf(buttonVariants())).toContain('h-12')",
      "expect.soft(buttonVariants()).toContain('h-12')",
      'expect(row).toHaveClass(listItemVariants())',
      'expect(row.className).toBe(listItemVariants({ selected: false }))',
      "const classes = buttonVariants({ size: 'sm' })\nexpect(classes).toContain('h-8')",
      "const classes = buttonVariants().split(' ')\nexpect(classes).not.toContain('is-interactive')",
      "const classes = [navVariants(), 'p-1'].join(' ')\nexpect(classes).toContain('p-1')",
      "for (const track of [trackVariants(), 'relative']) {\n  expect(track).toContain('relative')\n}",
      {
        code: "const classes = buttonVariants()\nexpect(classes).toContain('gap-2')\nexpect(classes).toContain('emphasis-subtler')",
        errors: 2
      }
    ]
  }
}

for (const [name, { valid, invalid }] of Object.entries(cases)) {
  tester.run(name, roadie.rules[name], {
    valid,
    invalid: invalid.map((code) => ({
      errors: 1,
      ...(typeof code === 'string' ? { code } : code)
    }))
  })
}

describe('import boundaries in eslint.config.js', () => {
  const eslint = new ESLint({
    cwd: fileURLToPath(new URL('..', import.meta.url))
  })

  // The first lint loads the config and parsers, which can take over 5s.
  beforeAll(
    () => eslint.lintText('', { filePath: 'packages/core/src/index.ts' }),
    60_000
  )

  const ruleHits = async (code, filePath) => {
    const [result] = await eslint.lintText(code, { filePath })
    return result.messages
      .map((message) => message.ruleId)
      .filter((ruleId) =>
        /no-restricted-imports|no-dynamic-/.test(ruleId ?? '')
      )
  }

  it.each([
    [
      "import Link from 'next/link'\n",
      'packages/components/src/components/Button/index.tsx'
    ],
    [
      "import Link from 'next/link'\n",
      'packages/components/src/components/Sortable/dnd/index.ts'
    ],
    [
      "import { useRouter } from 'next/navigation'\n",
      'packages/widgets/src/cart-drawer/react/CartDrawer.tsx'
    ],
    [
      "export const load = () => import('next/navigation')\n",
      'packages/widgets/src/cart-drawer/react/CartDrawer.tsx'
    ],
    [
      "export const load = () => import('next/link')\n",
      'packages/components/src/components/Button/index.tsx'
    ],
    [
      "export const load = () => import('next/link')\n",
      'packages/core/src/dashboard/layout.ts'
    ],
    ["import { z } from 'zod'\n", 'packages/core/src/dashboard/layout.ts'],
    [
      "export const load = () => import('zod')\n",
      'packages/core/src/dashboard/cells.ts'
    ],
    [
      "export const load = () => import('./schema')\n",
      'packages/core/src/dashboard/totals.ts'
    ],
    [
      "import { tableColumnSchema } from './schema'\n",
      'packages/core/src/dashboard/totals.ts'
    ]
  ])('flags %s in %s', async (code, filePath) => {
    expect(await ruleHits(code, filePath)).toHaveLength(1)
  })

  it.each([
    ["import Link from 'next/link'\n", 'docs/src/app/page.tsx'],
    [
      "import { useRouter } from 'next/navigation'\n",
      'packages/widgets/src/cart-drawer/vue/useCart.ts'
    ],
    [
      "import type { TableColumn } from './schema'\n",
      'packages/core/src/dashboard/cells.ts'
    ],
    ["import { z } from 'zod'\n", 'packages/core/src/dashboard/validate.ts'],
    [
      "export const load = () => import('zod')\n",
      'packages/core/src/dashboard/validate.ts'
    ]
  ])('allows %s in %s', async (code, filePath) => {
    expect(await ruleHits(code, filePath)).toEqual([])
  })
})

describe('where no-fixed-sleep applies', () => {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const linters = {
    root: new ESLint({ cwd: root }),
    docs: new ESLint({ cwd: `${root}docs` })
  }
  const sleep =
    'export const settle = (ms: number) =>\n  new Promise((resolve) => setTimeout(resolve, ms))\n'

  beforeAll(
    () =>
      Promise.all(
        Object.values(linters).map((linter) =>
          linter.lintText('', { filePath: 'src/index.ts' })
        )
      ),
    60_000
  )

  const sleeps = async (config, filePath) => {
    const [result] = await linters[config].lintText(sleep, { filePath })
    return result.messages.filter(
      ({ ruleId }) => ruleId === 'roadie/no-fixed-sleep'
    ).length
  }

  it.each([
    ['root', 'packages/components/src/components/Badge/Badge.test.tsx', 1],
    [
      'root',
      'packages/components/src/components/Badge/Badge.browser.test.tsx',
      1
    ],
    ['root', 'packages/components/src/components/Badge/index.tsx', 0],
    ['docs', 'src/components/OnThisPage.test.tsx', 1],
    ['docs', 'e2e/live-examples.e2e.test.ts', 1],
    ['docs', 'src/components/landOn.ts', 0]
  ])('%s config, %s: %i', async (config, filePath, hits) => {
    expect(await sleeps(config, filePath)).toBe(hits)
  })
})

describe('docs/eslint.config.js on MDX', () => {
  const docs = fileURLToPath(new URL('../docs/', import.meta.url))
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

  beforeAll(
    () =>
      Promise.all(
        [eslint, guardOnly].map((linter) =>
          linter.lintText('', { filePath: 'src/app/sample/page.mdx' })
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
    ['<Heart />', 'roadie/phosphor-icon-weight']
  ])(
    'fails %s in a tsx-live fence, with icons from scope',
    async (icon, ruleId) => {
      expect(
        await mdxHits(`\`\`\`tsx-live\n${icon}\n\`\`\``, ruleId)
      ).toHaveLength(1)
    }
  )

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
