// What each JS subpath of a package costs a browser, in brotli bytes, and how
// that compares with the package's checked-in size-budget.json.
//   own      the package's own code: every bare import left out
//   full     with its dependencies bundled in
//   initial  the same with code splitting: the entry chunk and its static
//            imports, without what only an import() reaches
import { isAbsolute } from 'node:path'
import { promisify } from 'node:util'
import zlib from 'node:zlib'
import { rolldown } from 'rolldown'

export const BUDGET_FILE = 'size-budget.json'
const METRICS = ['own', 'full', 'initial']
// The app brings these, and mjml only runs in Node, so no subpath pays for them.
const PROVIDED = /^(react|react-dom|vue)(\/.*)?$|^mjml|^node:/
const isBare = (id) =>
  !id.startsWith('.') && !id.startsWith('\0') && !isAbsolute(id)
const allowance = (bytes) => Math.max(bytes * 0.03, 300)

export function jsSubpaths(exports) {
  return Object.entries(exports)
    .map(([subpath, target]) => ({
      subpath,
      file:
        typeof target === 'string' ? target : (target.import ?? target.default)
    }))
    .filter(
      ({ subpath, file }) => file?.endsWith('.js') && !subpath.includes('*')
    )
}

function initialChunks(chunks) {
  const byName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]))
  const initial = new Set()
  const add = (name) => {
    const chunk = byName.get(name)
    if (!chunk || initial.has(chunk)) return
    initial.add(chunk)
    chunk.imports.forEach(add)
  }
  for (const chunk of chunks) if (chunk.isEntry) add(chunk.fileName)
  return [...initial]
}

export async function bundle(file, metric) {
  const build = await rolldown({
    input: file,
    external: (id, importer) =>
      importer !== undefined &&
      (PROVIDED.test(id) || (metric === 'own' && isBare(id))),
    platform: 'browser',
    resolve: {
      conditionNames: ['module', 'production', 'browser', 'import', 'default']
    },
    transform: { define: { 'process.env.NODE_ENV': '"production"' } },
    logLevel: 'silent'
  })
  try {
    const { output } = await build.generate({
      format: 'esm',
      minify: true,
      comments: { annotation: false },
      codeSplitting: metric === 'initial'
    })
    const chunks = output.filter((item) => item.type === 'chunk')
    // rolldown leaves an import it can't resolve external, with a warning,
    // which would pass as a smaller bundle.
    const names = new Set(chunks.map((chunk) => chunk.fileName))
    const unbundled = chunks
      .flatMap((chunk) => [...chunk.imports, ...chunk.dynamicImports])
      .filter((id) => !names.has(id) && !PROVIDED.test(id))
    if (metric !== 'own' && unbundled.length > 0)
      throw new Error(`${file} imports ${unbundled.join(', ')}, not installed.`)
    return (metric === 'initial' ? initialChunks(chunks) : chunks)
      .map((chunk) => chunk.code)
      .join('\n')
  } finally {
    await build.close()
  }
}

// Brotli is most of the run, so it goes to the thread pool, three at a time.
const brotli = promisify(zlib.brotliCompress)
async function brotliBytes(code) {
  const compressed = await brotli(code, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: Buffer.byteLength(code)
    }
  })
  return compressed.length
}

export async function measure(file) {
  const sizes = await Promise.all(
    METRICS.map(async (metric) => [
      metric,
      await brotliBytes(await bundle(file, metric))
    ])
  )
  return Object.fromEntries(sizes)
}

const hasBudget = (row) =>
  METRICS.every((metric) => Number.isFinite(row?.[metric]))
const bytes = (count) => `${count.toLocaleString('en-AU')} B`
const signed = (text, delta) => (delta > 0 ? `+${text}` : `-${text}`)
function change({ subpath, metric, budget, measured }) {
  const delta = measured - budget
  const percent = `${(Math.abs(delta / budget) * 100).toFixed(1)}%`
  return `  ${subpath}  ${metric}  ${bytes(budget)} to ${bytes(measured)} (${signed(bytes(Math.abs(delta)), delta)}, ${signed(percent, delta)})`
}

export function checkBudget(name, budget, measured) {
  const subpaths = Object.keys(measured)
  const budgeted = (subpath) =>
    Object.hasOwn(budget, subpath) && hasBudget(budget[subpath])
  const rows = subpaths.filter(budgeted).flatMap((subpath) =>
    METRICS.map((metric) => ({
      subpath,
      metric,
      budget: budget[subpath][metric],
      measured: measured[subpath][metric]
    }))
  )
  const failures = [
    ...rows
      .filter((row) => row.measured > row.budget + allowance(row.budget))
      .map(change),
    ...subpaths
      .filter((subpath) => !budgeted(subpath))
      .map((subpath) => `  ${subpath}  no budget in ${BUDGET_FILE}`),
    ...Object.keys(budget)
      .filter((subpath) => !Object.hasOwn(measured, subpath))
      .map((subpath) => `  ${subpath}  no longer exported`)
  ]
  const shrunk = rows
    .filter((row) => row.measured < row.budget - allowance(row.budget))
    .map(change)
  const update = `\`pnpm --filter ${name} size:update\``
  const smaller = shrunk.length
    ? `\n\nSmaller than the budget. Run ${update} to keep the saving:\n${shrunk.join('\n')}`
    : ''
  if (failures.length === 0)
    return {
      ok: true,
      message: `${name}: every subpath is within its size budget (${subpaths.length} measured).${smaller}`
    }
  return {
    ok: false,
    message: `${name}: the size budget check failed. A subpath may grow by 3% or 300 B of brotli, whichever is larger.\n\n${failures.join('\n')}\n\nIf the change is meant, run ${update} and commit ${BUDGET_FILE}.${smaller}`
  }
}

export const serialise = (table) =>
  `{\n${Object.entries(table)
    .map(
      ([subpath, sizes]) =>
        `  ${JSON.stringify(subpath)}: { ${METRICS.map((metric) => `"${metric}": ${sizes[metric]}`).join(', ')} }`
    )
    .join(',\n')}\n}\n`
