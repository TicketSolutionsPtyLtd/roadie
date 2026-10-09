import jscodeshift from 'jscodeshift'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = path.dirname(fileURLToPath(import.meta.url))
const fixtures = path.join(here, '__testfixtures__')

function run(transform, input, options) {
  const reports = []
  const api = {
    j: jscodeshift.withParser(transform.parser),
    jscodeshift: jscodeshift.withParser(transform.parser),
    stats: () => {},
    report: (message) => reports.push(message)
  }
  const output = transform.default(
    { path: 'app/page.tsx', source: input },
    api,
    options
  )
  return { output, reports }
}

for (const codemod of readdirSync(fixtures)) {
  const transform = await import(`./${codemod}.js`)

  describe(codemod, () => {
    const folder = path.join(fixtures, codemod)
    const cases = readdirSync(folder)
      .filter((name) => name.endsWith('.input.tsx'))
      .map((name) => name.replace('.input.tsx', ''))

    for (const name of cases) {
      it(name, () => {
        const read = (suffix) =>
          readFileSync(path.join(folder, `${name}.${suffix}`), 'utf8')
        const optionsFile = path.join(folder, `${name}.options.json`)
        const options = existsSync(optionsFile)
          ? JSON.parse(readFileSync(optionsFile, 'utf8'))
          : {}
        const reportFile = path.join(folder, `${name}.report.txt`)

        const { output, reports } = run(transform, read('input.tsx'), options)

        expect(output).toBe(read('output.tsx'))
        expect(reports.join('\n')).toBe(
          existsSync(reportFile) ? read('report.txt').trimEnd() : ''
        )
      })
    }
  })
}
