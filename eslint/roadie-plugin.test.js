import typescriptParser from '@typescript-eslint/parser'
import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'

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
      // layout=row always wraps, so a row that doesn't stays
      "<div className='flex items-center gap-3'><CalendarTile /><p>Fri</p></div>",
      "<div className='flex gap-2'><Badge /><Badge /></div>",
      "<div className='flex flex-row items-center gap-2'><Badge /></div>",
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
  'no-unwaited-popup-pick': {
    valid: [
      "await pickOption(user, { from: select, option: 'City' })",
      "await user.click(await withFrames(() => screen.findByRole('option')))",
      // A known gap: this finds a closing popup's option just the same, but
      // today each such click follows a wait in the same open popup.
      "await user.click(screen.getByRole('option', { name: 'City' }))",
      "fireEvent.click(await screen.findByRole('option'))",
      "await user.click(await screen.findByRole('button', { name: 'Save' }))",
      "let item = await screen.findByRole('menuitem')\nawait user.click(item)",
      "const item = screen.getByRole('menuitem')\nawait user.click(item)"
    ],
    invalid: [
      "await user.click(await screen.findByRole('option', { name: 'City' }))",
      "await userEvent.click(await within(menu).findByRole('menuitem'))",
      "await user.click(await findByRole('menuitemradio', { name: 'Left' }))",
      "await user.click((await screen.findAllByRole('option'))[1])",
      "await user.click((await screen.findAllByRole('option')).at(-1))",
      "const item = await screen.findByRole('menuitemcheckbox')\nawait user.click(item)"
    ]
  },
  'no-dropped-class-name-callback': {
    valid: [
      "import { Select } from '@base-ui/react/select'\n<Select.Popup className={mergeClassName(base, className)} />",
      "import { Select } from '@base-ui/react/select'\n<Select.Popup className={className} />",
      // Only Roadie's own classes, so no consumer callback to keep.
      "import { Select } from '@base-ui/react/select'\n<Select.Popup className={cn(base, open && 'grid')} />",
      // A plain element can't take a callback.
      '<div className={cn(base, className)} />',
      "import { Select } from './Select'\n<Select.Popup className={cn(base, className)} />",
      "import type { Select } from '@base-ui/react/select'\n<Select.Popup className={cn(base, className)} />",
      "import { Button } from '@base-ui/react/button'\nconst classes = mergeClassName(variants({ size }), className);\n<Button className={classes} />",
      "import { Button } from '@base-ui/react/button'\n<Button className={variants({ className: 'h-8' })} />",
      "import { Button } from '@base-ui/react/button'\n<Button className={props.className} />",
      "import { Button } from '@base-ui/react/button'\n<Button className={(state) => cn(base, typeof className === 'function' ? className(state) : className)} />"
    ],
    invalid: [
      "import { Select as SelectPrimitive } from '@base-ui/react/select'\n<SelectPrimitive.Popup className={cn(base, className)} />",
      "import { Button } from '@base-ui/react/button'\n<Button className={cn(base, size && 'h-8', className)} />",
      "import { Menu } from '@base-ui/react/menu'\n<Menu.Item className={cn(base, props.className)} />",
      "import { Tabs } from '@base-ui/react'\n<Tabs.Tab className={cn([base, className])} />",
      "import { Button } from '@base-ui/react/button'\n<Button className={variants({ size, className })} />",
      "import { Button } from '@base-ui/react/button'\nconst classes = cn(variants({ size, className }));\n<Button className={classes} />",
      "import { Button } from '@base-ui/react/button'\n<Button className={`${base} ${className}`} />",
      "import { Button } from '@base-ui/react/button'\n<Button className={open ? cn(base, className) : base} />",
      "import { Button } from '@base-ui/react/button'\n<Button className={className && cn(base, className)} />",
      "import { Button } from '@base-ui/react/button'\n<Button className={cn(base, className) || base} />",
      "import { Button } from '@base-ui/react/button'\n<Button className={(state) => cn(base, className)} />"
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
  'no-named-zod-import': {
    valid: [
      "import * as z from 'zod'",
      "import type { core, z } from 'zod'",
      "import { type z } from 'zod'",
      "import * as z from 'zod/mini'",
      "import { object } from 'zod'",
      "import { z } from 'zodiac'",
      "export type { z } from 'zod'"
    ],
    invalid: [
      "import { z } from 'zod'",
      "import z from 'zod'",
      "import { type core, z } from 'zod'",
      "import { default as z } from 'zod'",
      "import { z } from 'zod/mini'",
      "import { z } from 'zod/v4'",
      "export { z } from 'zod'"
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
