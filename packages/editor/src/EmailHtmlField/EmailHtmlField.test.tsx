import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { EmailHtmlField } from '.'

describe('EmailHtmlField on the server', () => {
  it('renders the source and its sandboxed preview', () => {
    const html = renderToString(
      <EmailHtmlField aria-label='Email HTML' defaultValue='<p>Hi</p>' />
    )
    expect(html).toContain('&lt;p&gt;Hi&lt;/p&gt;</textarea>')
    expect(html).toContain('sandbox=""')
    expect(html).toMatch(/srcdoc="&lt;p&gt;Hi&lt;\/p&gt;"/i)
  })
})
