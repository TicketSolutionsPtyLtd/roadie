import { runRuleCases } from '../test/ruleCases.js'

runRuleCases({
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
