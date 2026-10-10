import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const motion = readFileSync(new URL('./motion.css', import.meta.url), 'utf8')
const skill = readFileSync(
  new URL('../../../../skills/motion/SKILL.md', import.meta.url),
  'utf8'
)

const named = (pattern: RegExp) => new Set(skill.match(pattern))
const deprecated = new Set(
  [...motion.matchAll(/\/\* @deprecated[^*]*\*\/\s*@utility ([\w-]+)/g)].map(
    ([, name]) => name
  )
)
const utilities = [...motion.matchAll(/@utility ([\w-]+)/g)].map(
  ([, name]) => name!
)
const durations = [...motion.matchAll(/--duration-([\w-]+):/g)].map(
  ([, step]) => step!
)
const easings = [...motion.matchAll(/--(ease-[\w-]+):/g)].map(
  ([, name]) => name!
)

describe('the motion skill', () => {
  it('names every motion utility in motion.css', () => {
    for (const utility of utilities) expect(skill).toContain(`\`${utility}\``)
  })

  it('names only utilities motion.css has', () => {
    for (const utility of named(/\b(?:animate|motion)-[a-z]+(?:-[a-z]+)*/g)) {
      if (
        /^animate-(spin|pulse|bounce|ping)$|^motion-(dev-|safe$|reduce$)/.test(
          utility
        )
      )
        continue
      expect(utilities).toContain(utility)
    }
  })

  it('lists every deprecated utility as deprecated', () => {
    const bullet = skill
      .split('\n- ')
      .find((item) => item.includes('deprecated'))
    expect(deprecated.size).toBeGreaterThan(0)
    for (const utility of deprecated) expect(bullet).toContain(`\`${utility}\``)
  })

  it('names every duration and easing token', () => {
    expect(durations.length).toBeGreaterThan(0)
    for (const step of durations) expect(skill).toContain(`duration-${step}`)
    for (const easing of new Set(easings)) expect(skill).toContain(easing)
    expect(skill).toContain('--stagger-base')
  })
})
