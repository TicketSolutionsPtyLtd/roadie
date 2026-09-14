import { defineRolldownBabelPreset } from '@rolldown/plugin-babel'
import { relative } from 'node:path'

type CompilerEvent = {
  kind: string
  fnLoc?: { start: { line: number } } | null
  detail?: { options?: { reason?: string }; reason?: string }
  data?: string
}

const reported = new Set<string>()

// `REACT_COMPILER_REPORT=1 pnpm build` lists every function the compiler
// skipped. Skipped functions still ship, just without automatic memoisation.
function logEvent(filename: string | null, event: CompilerEvent) {
  if (!process.env.REACT_COMPILER_REPORT) return
  if (event.kind !== 'CompileError' && event.kind !== 'PipelineError') return
  const file = filename ? relative(process.cwd(), filename) : '<unknown>'
  const line = event.fnLoc?.start.line ?? '?'
  const reason =
    event.detail?.options?.reason ?? event.detail?.reason ?? event.data
  const message = `[react-compiler] skipped ${file}:${line} ${reason}`
  if (reported.has(message)) return
  reported.add(message)
  console.warn(message)
}

// Client modules only. The compiler's cache is a hook, and server components
// can't call hooks, so a server-safe module (no directive) stays uncompiled.
export const reactCompilerPreset = defineRolldownBabelPreset({
  preset: () => ({
    plugins: [
      ['babel-plugin-react-compiler', { target: '19', logger: { logEvent } }]
    ]
  }),
  rolldown: {
    filter: {
      id: /\/src\/.*\.tsx?$/,
      code: /^['"]use client['"]/m
    }
  }
})
