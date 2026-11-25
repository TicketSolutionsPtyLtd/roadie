import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import packageJson from '../../package.json'
import { RoadieProvider } from '../providers/RoadieProvider'
import { BeforePaint } from './beforePaint'

const exportsMap = packageJson.exports as Record<string, { import?: string }>

// Each JS subpath's entry, as source, so nothing needs building.
const entries = Object.values(exportsMap).flatMap(({ import: built }) =>
  built ? [built.replace('./dist/', '../').replace(/\.js$/, '')] : []
)

describe('BeforePaint', () => {
  it('ships from no subpath, so no app can hand it a script', async () => {
    const sources = import.meta.glob([
      '../index.tsx',
      '../components/*/index.tsx'
    ])
    const exported: string[] = []
    for (const entry of entries) {
      const load = sources[`${entry}.tsx`] ?? sources[`${entry}.ts`]
      if (!load) continue
      const module = (await load()) as Record<string, unknown>
      if (Object.values(module).includes(BeforePaint)) exported.push(entry)
    }
    expect(entries.length).toBeGreaterThan(80)
    expect(exported).toEqual([])
  })

  it('keeps hostile words inside its one script', () => {
    const html = renderToString(
      <>
        <time>Wed 25 Nov 2026</time>
        <BeforePaint
          fix={{
            kind: 'drop-year',
            year: '2026',
            timeZone: '</script><script>alert(1)//',
            words: ['<!--</script><img src=x onerror=alert(1)>']
          }}
        />
      </>
    )
    expect(html.match(/<script/g)).toHaveLength(1)
    expect(html.match(/<\/script>/g)).toHaveLength(1)
    expect(html).not.toContain('<img')
  })

  it("carries the app's nonce from RoadieProvider", () => {
    const html = renderToString(
      <RoadieProvider nonce='r4nd0m' theme={false} toast={false}>
        <kbd />
        <BeforePaint fix={{ kind: 'keyboard' }} />
      </RoadieProvider>
    )
    expect(html).toContain('nonce="r4nd0m"')
  })
})
