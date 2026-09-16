import { Code } from './components/Code'
import { NavigatorItem } from './components/Navigator/NavigatorItem'

const memoCache = /const \$ = \(0,\s*[\w$]+\.c\)\(\d+\)/

describe('React Compiler in tests', () => {
  it('compiles client modules', () => {
    expect(String(NavigatorItem)).toMatch(memoCache)
  })

  it('leaves server-safe modules alone', () => {
    expect(String(Code)).not.toMatch(memoCache)
  })
})
