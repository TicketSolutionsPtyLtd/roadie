import { runRuleCases } from '../test/ruleCases.js'

runRuleCases({
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
  'no-layout-fake-in-jsdom': {
    valid: [
      'expect(getComputedStyle(el).display).toBe("none")',
      'const width = el.getBoundingClientRect().width',
      "vi.spyOn(Element.prototype, 'scrollTo')",
      "Object.defineProperty(track, 'scrollLeft', { value: 40, writable: true })",
      "vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Win32')",
      "Object.defineProperty(window, 'matchMedia', { value: (query) => ({ matches: query === '(prefers-reduced-motion: reduce)' }) })",
      "window.matchMedia = vi.fn().mockReturnValue({ matches: query.includes('prefers-color-scheme: dark') })",
      "vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true })",
      "render(<Image sources={[{ media: '(max-width: 767px)', widths: [800] }]} />)",
      'let clientWidth = 0\nclientWidth = el.clientWidth',
      'const rect = Object.assign({}, base, { offsetWidth: 200 })',
      'Object.assign(window, { scrollY: 40 })'
    ],
    invalid: [
      "vi.spyOn(window, 'getComputedStyle').mockImplementation(() => ({ lineHeight: '24px' }))",
      "vi.stubGlobal('getComputedStyle', fake)",
      'window.getComputedStyle = fake',
      "vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(rect)",
      'el.getBoundingClientRect = () => ({ top }) as DOMRect',
      "el['getClientRects'] = () => []",
      "Object.defineProperty(el, 'offsetWidth', { value: 200 })",
      "Object.defineProperty(HTMLElement.prototype, 'offsetLeft', { get: () => 0 })",
      "vi.spyOn(HTMLDivElement.prototype, 'clientHeight', 'get').mockReturnValue(40)",
      'Object.defineProperties(el, { scrollHeight: { value: 400 } })',
      "vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(375)",
      'innerWidth = 375',
      'Object.assign(window, { innerWidth: 375 })',
      "Object.assign(window, { matchMedia: (q) => ({ matches: q === '(min-width: 48rem)' }) })",
      "window.matchMedia = (query) => ({ matches: query === '(min-width: 768px)' })",
      "vi.stubGlobal('matchMedia', (query) => ({ matches: query === '(max-width: 47.99rem)' }))",
      "vi.spyOn(window, 'matchMedia').mockImplementation((q) => ({ matches: q === `(width < 48rem)` }))",
      "Object.defineProperty(window, 'matchMedia', { value: mock })\nmock.mockImplementation((q) => ({ matches: q === '(48rem <= width)' }))",
      {
        code: "window.matchMedia = mock\nconst PHONE = '(min-width: 0) and (max-height: 600px)'\nconst DESKTOP = '(min-width: 1024px)'",
        errors: 2
      }
    ]
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
      'vi.advanceTimersByTime(ms)',
      "import { setTimeout } from 'node:timers'"
    ],
    invalid: [
      'await new Promise((resolve) => setTimeout(resolve, 100))',
      'await page.waitForTimeout(50)',
      "await userEvent.pointer([{ type: 'wait', ms: 20 }])",
      "import { setTimeout } from 'node:timers/promises'",
      "import { setTimeout as sleep } from 'timers/promises'",
      "import * as timers from 'node:timers/promises'",
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
})
