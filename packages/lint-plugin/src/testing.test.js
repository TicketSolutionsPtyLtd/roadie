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
  }
})
