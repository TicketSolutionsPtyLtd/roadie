import { matchesGlob, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Reporter, TestCase, Vitest } from 'vitest/node'

type Browser = 'chromium' | 'webkit' | 'firefox'

type Quarantined = {
  browser: Browser
  file: string
  /** The full name as Vitest reports it, describe blocks joined by ' > '. */
  test: string
  why: string
  ticket: string
}

// Known flakes: skipped in the blocking CI job for their browser, and run
// without retries in the non-blocking quarantine job. An entry needs failures
// on two PRs that didn't touch it, and leaves once its root cause is fixed.
export const quarantined: Quarantined[] = [
  {
    browser: 'webkit',
    file: 'packages/components/src/components/Calendar/Calendar.browser.test.tsx',
    test: 'Calendar dragged with a mouse > still chooses a range by clicks, with its preview',
    why: 'No data-range-preview right after the hover, on #283 and #290',
    ticket: 'https://oztix.atlassian.net/browse/INNO-1043'
  },
  {
    browser: 'webkit',
    file: 'packages/components/src/components/Select/Select.browser.test.tsx',
    test: 'Select options on a touch screen > still highlight the option a keyboard moves to',
    why: 'Focus stays on the trigger after ArrowDown, on #262 and #275',
    ticket: 'https://oztix.atlassian.net/browse/INNO-1043'
  }
]

const REPO_ROOT = fileURLToPath(new URL('./', import.meta.url))

const browsers = (process.env.ROADIE_BROWSERS ?? 'chromium,webkit,firefox')
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean)

// Firefox pages share one window activation, so a parallel file's input blurs
// another file's document mid-test and Enter then activates nothing.
export const browserInstances = browsers.map((browser) => ({
  browser,
  fileParallelism: browser !== 'firefox'
}))

const quarantineMode = process.env.ROADIE_QUARANTINE as
  'skip' | 'only' | undefined

const active = quarantined.filter(({ browser }) => browsers.includes(browser))

// testNamePattern applies to every engine in the run, so skip only the entries
// that cover all of them; the single-engine CI jobs skip their own.
const skipped = quarantined.filter(({ browser }) =>
  browsers.every((name) => name === browser)
)

const namePattern = (entries: Quarantined[]) =>
  entries
    .map(({ test }) => test.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')

// Retries in CI hide one-off flakes; the quarantine run keeps them visible.
export const browserRetry = process.env.CI && quarantineMode !== 'only' ? 2 : 0

export function quarantineInclude(packageDir: string, include: string[]) {
  if (quarantineMode !== 'only') return include
  const prefix = `${relative(REPO_ROOT, packageDir)}/`
  return active
    .filter(({ file }) => file.startsWith(prefix))
    .map(({ file }) => file.slice(prefix.length))
    .filter((file) => include.some((glob) => matchesGlob(file, glob)))
}

const quarantineFilter =
  quarantineMode === 'only'
    ? {
        testNamePattern: new RegExp(`(?:^|> )(?:${namePattern(active)})$`),
        passWithNoTests: true
      }
    : quarantineMode === 'skip' && skipped.length > 0
      ? {
          testNamePattern: new RegExp(
            `^(?!(?:.*> )?(?:${namePattern(skipped)})$)`
          )
        }
      : {}

class FlakyReporter implements Reporter {
  onTestCaseResult(testCase: TestCase) {
    const diagnostic = testCase.diagnostic()
    if (!diagnostic?.flaky) return
    const file = relative(REPO_ROOT, testCase.module.moduleId)
    console.log(
      `::warning file=${file},title=Flaky browser test::${testCase.project.name} > ${testCase.fullName} passed after ${diagnostic.retryCount} ${diagnostic.retryCount === 1 ? 'retry' : 'retries'}`
    )
  }
}

// passWithNoTests keeps the quarantine job green, so flag an entry whose test
// was renamed or deleted and now matches nothing.
class UnmatchedQuarantineReporter implements Reporter {
  private root = ''
  private ran = new Set<string>()

  onInit(vitest: Vitest) {
    this.root = `${relative(REPO_ROOT, vitest.config.root)}/`
  }

  onTestCaseResult(testCase: TestCase) {
    if (testCase.result().state === 'skipped') return
    const file = relative(REPO_ROOT, testCase.module.moduleId)
    this.ran.add(`${file}\0${testCase.fullName}`)
  }

  onTestRunEnd() {
    for (const { file, test } of active) {
      if (!file.startsWith(this.root) || this.ran.has(`${file}\0${test}`))
        continue
      console.log(
        `::warning file=${file},title=Quarantined test not found::No test named "${test}" ran; update or remove its quarantine entry`
      )
    }
  }
}

export const browserRunOptions = {
  ...quarantineFilter,
  ...(process.env.CI && {
    reporters: [
      'default',
      'github-actions',
      new FlakyReporter(),
      ...(quarantineMode === 'only' ? [new UnmatchedQuarantineReporter()] : [])
    ]
  })
}
