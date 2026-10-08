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
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon {...iconProps} />"
    ],
    invalid: [
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon weight='regular' />",
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon weight={'regular'} />",
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon weight={`thin`} />",
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon weight={selected ? 'fill' : 'regular'} />",
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon weight={iconWeight ?? 'thin'} />",
      "import { HeartIcon } from '@phosphor-icons/react'; <HeartIcon />"
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
      'await expect.poll(() => value).toBe(1)'
    ],
    invalid: [
      'await new Promise((resolve) => setTimeout(resolve, 100))',
      'await page.waitForTimeout(50)',
      "await userEvent.pointer([{ type: 'wait', ms: 20 }])"
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
  'no-compound-root-identity': {
    valid: ['expect(screen.getByRole("dialog")).toBeVisible()'],
    invalid: ['expect(Dialog).toBe(Dialog.Root)']
  },
  'no-cva-output-assertion': {
    valid: ["expect(screen.getByRole('button')).toHaveClass('intent-accent')"],
    invalid: [
      "expect(buttonVariants({ intent: 'accent' })).toContain('intent-accent')"
    ]
  }
}

for (const [name, { valid, invalid }] of Object.entries(cases)) {
  tester.run(name, roadie.rules[name], {
    valid,
    invalid: invalid.map((code) => ({ code, errors: 1 }))
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
