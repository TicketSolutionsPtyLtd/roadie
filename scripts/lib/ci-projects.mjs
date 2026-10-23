// CI's check job runs `turbo test`, and its browser jobs `turbo test:browser`.
export const CI_SCRIPTS = ['test', 'test:browser']
export const PERF_SCRIPT = 'test:perf'

const PROJECT = /--project[= ](?:'([^']*)'|"([^"]*)"|(\S+))/g
const LEADING_ENV = /^(?:\w+=\S+\s+)*/

export function projectsIn(script) {
  return [...script.matchAll(PROJECT)].map(
    ([, single, double, bare]) => single ?? double ?? bare
  )
}

function envIn(script) {
  return Object.fromEntries(
    script
      .match(LEADING_ENV)[0]
      .split(/\s+/)
      .filter(Boolean)
      .map((assignment) => assignment.split('='))
  )
}

// No projects means a CI script runs every project, so vitest gets no filter.
export function ciProjects(scripts) {
  const lists = CI_SCRIPTS.filter((name) => scripts[name]).map((name) =>
    projectsIn(scripts[name])
  )
  if (lists.length === 0 || lists.some((list) => list.length === 0)) return []
  return [...new Set(lists.flat())]
}

export function perfRun(scripts) {
  const script = scripts[PERF_SCRIPT]
  if (!script) return null
  return { projects: projectsIn(script), env: envIn(script) }
}

export const isPerfTest = (file) =>
  /\.perf\.browser\.test\.[cm]?[jt]sx?$/.test(file)

/** The projects and env a gated run adds, matching CI unless perf is asked for. */
export function gatedProjects({ scripts, files, perf, vitestArgs }) {
  if (vitestArgs.some((arg) => arg.startsWith('--project'))) {
    return { projectArgs: [], env: {} }
  }
  const wantsPerf = perf || (files.length > 0 && files.every(isPerfTest))
  if (!wantsPerf) {
    return {
      projectArgs: ciProjects(scripts).flatMap((name) => ['--project', name]),
      env: {}
    }
  }
  const run = perfRun(scripts)
  if (!run) return null
  return {
    projectArgs: run.projects.flatMap((name) => ['--project', name]),
    env: run.env
  }
}
