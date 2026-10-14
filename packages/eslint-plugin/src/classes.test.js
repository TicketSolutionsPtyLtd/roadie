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
  }
})
