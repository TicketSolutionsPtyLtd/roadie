import { fileURLToPath } from 'node:url'

import { runRuleCases } from '../test/ruleCases.js'

runRuleCases({
  'no-dark-variant': {
    valid: [
      "<div className='dark bg-normal' />",
      "let variants = { open: 'dark:bg-strong' }; cn(variants.open)",
      "const theme = pick('dark:bg-strong'); cn(theme)",
      "const inner = { open: 'dark:bg-strong' }; const variants = { inner }; cn(variants)"
    ],
    invalid: [
      "<div className='bg-normal dark:bg-strong' />",
      "const variants = { open: 'dark:bg-strong' }; cn(variants[state])",
      "const styles = 'p-2 dark:bg-strong'; <div className={styles} />",
      "const styles = ['p-2', 'dark:bg-strong'] as const; cn(styles)",
      "const variants = { open: 'dark:bg-strong' } satisfies Record<string, string>; cn(variants.open)",
      'function Box({ open }) { const extra = `dark:bg-strong`; return <div className={cn(open && extra)} /> }',
      "tv({ base: 'p-2', variants: { tone: { night: 'dark:bg-strong' } } })",
      {
        code: "const styles = 'dark:bg-strong'; cn(styles); <div className={styles} />",
        errors: 1
      },
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
      "<div className='rounded-[inherit]' />",
      "<li className='[--record-table-row-end-radius:var(--radius-xl)]'><div className={cn('rounded-b-(--record-table-row-end-radius)')} /></li>",
      "<ul className='[&>li:has(+li)]:[--record-table-row-end-radius:0px]' />",
      "cva(['[--pane-radius:var(--radius-2xl)] max-md:[--pane-radius:var(--pane-radius-phone,0px)]', 'rounded-(--pane-radius)'])",
      "<div className='[--x:0] rounded-(--x)' />",
      "<div className='[--gap:7px] rounded-(--x) gap-(--gap)' />",
      "<div className='rounded-(--x)' style={{ '--x': 'var(--radius-lg)' }} />",
      "<div className='rounded-sm' style={{ '--x': '7px' }} />"
    ],
    invalid: [
      "<div className='rounded-[10px]' />",
      "cn({ 'rounded-tl-[4px]': open })",
      "<div className='[--x:7px] rounded-(--x)' />",
      "cn('md:[--x:0.5rem]', open && 'rounded-t-(length:--x)')",
      "cva(['[--x:var(--y,50%)]', 'rounded-(--x)'])",
      "<div className='[--x:calc(var(--radius-xl)_+_2px)] rounded-(--x)' />",
      "<div className='[--x:2vw] rounded-(--x)' />",
      "<div className='rounded-(--x)' style={{ '--x': '7px' }} />",
      {
        code: "<div className='[--x:1em] rounded-(--x) rounded-[3px]' />",
        errors: 2
      }
    ]
  }
})

// The core package resolves Roadie's stylesheet and Tailwind, as an app does.
const filename = fileURLToPath(
  new URL('../../core/src/Fixture.tsx', import.meta.url)
)
const fixed = (code, output, errors = 1) => ({ code, output, errors, filename })

runRuleCases({
  'canonical-class': {
    valid: [
      "<div className='p-4 rounded-lg emphasis-subtle is-interactive' />",
      "<div className='hover:bg-subtle data-[state=open]:flex' />",
      '<div className={`p-${size} w-[50%]`} />',
      'cn(`flex-shrink-0${suffix} ${prefix}flex-shrink-0`)',
      "const id = 'p-[16px]'",
      "<div className='relative z-1 hover:z-1' />",
      "<div className='z-[1] hover:[z-index:1]' />"
    ].map((code) => ({ code, filename })),
    invalid: [
      fixed("<div className='p-[16px]' />", "<div className='p-4' />"),
      fixed(
        "<div className='flex-shrink-0 !flex hover:mt-[0.5rem]' />",
        "<div className='shrink-0 flex! hover:mt-2' />",
        3
      ),
      fixed(
        "cn('bg-[var(--x)]', open && 'z-[10]')",
        "cn('bg-(--x)', open && 'z-10')",
        2
      ),
      fixed(
        "const variants = { sm: 'h-[1px]' }; cva('', { variants: { size: variants } }); cn(variants.sm)",
        "const variants = { sm: 'h-px' }; cva('', { variants: { size: variants } }); cn(variants.sm)"
      ),
      fixed(
        'cn(`size-[16px] ${open} [&>*]:p-4`)',
        'cn(`size-4 ${open} *:p-4`)',
        2
      ),
      fixed(
        "<div className='overflow-ellipsis' />",
        "<div className='text-ellipsis' />"
      ),
      fixed(
        "<div className='top-[-1px] md:order-[-1] z-[80]' />",
        "<div className='-top-px md:-order-1 z-alert' />",
        3
      ),
      fixed(
        "<div className='mb-[calc(var(--gap)*-1)]' />",
        "<div className='-mb-(--gap)' />"
      ),
      fixed(
        "<div className='[margin-top:-4px]' />",
        "<div className='-mt-1' />"
      )
    ]
  }
})
