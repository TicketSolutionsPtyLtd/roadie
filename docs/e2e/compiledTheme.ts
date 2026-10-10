import { readFile } from 'fs/promises'
import { createRequire } from 'module'
import { dirname, join, resolve } from 'path'
import { compile } from 'tailwindcss'

/** The CSS Tailwind compiles from Roadie's sheets for these classes. */
export async function compiledCss(candidates: string[]) {
  const loadStylesheet = async (id: string, base: string) => {
    const path = id.startsWith('.')
      ? resolve(base, id)
      : createRequire(join(base, 'noop.js')).resolve(
          id === 'tailwindcss' ? 'tailwindcss/index.css' : id
        )
    return { path, base: dirname(path), content: await readFile(path, 'utf8') }
  }
  const { build } = await compile(`@import '@oztix/roadie-core/css';`, {
    base: join(import.meta.dirname, '..'),
    loadStylesheet
  })
  return build(candidates)
}

/**
 * What Tailwind compiles each theme variable to with Roadie's CSS. The docs
 * build only emits the variables it uses, so the page's own CSS can't say.
 */
export async function compiledTheme(variables: string[]) {
  const css = await compiledCss(variables.map((name) => `w-(${name})`))
  return (name: string) =>
    css.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1] ?? 'not compiled'
}
