import { createElement } from 'react'

import { evaluate } from '@mdx-js/mdx'
import { renderToStaticMarkup } from 'react-dom/server'
import * as runtime from 'react/jsx-runtime'
import { describe, expect, it } from 'vitest'

import { dedent } from './dedent'

async function codePropFromMdx(mdx: string) {
  const { default: Content } = await evaluate(mdx, { ...runtime })
  let code = ''
  const Probe = (props: { code: string }) => {
    code = props.code
    return null
  }
  renderToStaticMarkup(createElement(Content, { components: { Probe } }))
  return code
}

describe('dedent', () => {
  it('restores the nesting of a multi-line code prop that MDX has stripped two spaces from', async () => {
    const code = await codePropFromMdx(
      [
        '<Probe',
        '  code={`',
        "    <div className='min-h-50'>",
        '      {content ?? <Skeleton />}',
        '    </div>',
        '  `}',
        '/>'
      ].join('\n')
    )
    expect(dedent(code)).toBe(
      "<div className='min-h-50'>\n  {content ?? <Skeleton />}\n</div>"
    )
  })

  it('leaves code with nothing to remove as it was', () => {
    expect(
      dedent("import {\n  HeartIcon\n} from '@phosphor-icons/react/ssr'")
    ).toBe("import {\n  HeartIcon\n} from '@phosphor-icons/react/ssr'")
  })

  it('ignores blank lines when it measures the indent', () => {
    expect(dedent('\n    a\n\n      b\n  ')).toBe('a\n\n  b')
  })
})
