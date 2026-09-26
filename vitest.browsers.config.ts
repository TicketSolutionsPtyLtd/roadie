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
