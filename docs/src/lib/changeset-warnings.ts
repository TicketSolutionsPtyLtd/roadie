import {
  type Bump,
  PACKAGE_PAGES,
  type PageIndex,
  RELEASED_PACKAGES,
  cardOf,
  classify,
  openingNames,
  ownPage,
  parseChangeset,
  summarise,
  toChange
} from './releases.ts'

export type ChangesetWarning = { file: string; message: string }

const FIRST_RELEASE = /^First release of `(@[^`]+)`/

/** "Add a `Calendar` component" or "Add a new `Calendar`": an opening verb, then at most an article or "new". */
const ADDS_LOOSELY =
  /^(?:Add|Adds|Added|Introduces?|New)\s+(?:(?:a|an|the|new)\s+)*/
// Narrower than "not a part", so a loose opening such as "Add a `Badge` tag variant" stays quiet.
const ENDS_NAMING = /^(?:$|[,.:;—(]|component\b|(?:to|in)\s+`)/

const CARD_FORM =
  'Open with "Add `Name`", list only names with a docs page of their own, then a comma and what it is.'

function firstReleaseWarnings(name: string, details: string): string[] {
  const warnings: string[] = []
  if (!summarise(details).summary)
    warnings.push(
      `First release of \`${name}\` has no details after its first sentence, so its changelog card has no description. Add a paragraph saying what the package is.`
    )
  if (!PACKAGE_PAGES[name])
    warnings.push(
      `First release of \`${name}\` has no entry in PACKAGE_PAGES (docs/src/lib/releases.ts), so its changelog card opens no page.`
    )
  return warnings
}

/**
 * What would keep a pending changeset off the docs changelog's highlight
 * cards: a new component worded so it lists as a plain change, or a
 * package's first release with no description or page.
 */
export function changesetWarnings(
  files: { file: string; source: string }[],
  index: PageIndex
): ChangesetWarning[] {
  const tracked = new Set<string>(RELEASED_PACKAGES.map((pkg) => pkg.name))
  return files.flatMap(({ file, source }) => {
    const changeset = parseChangeset(file, source)
    if (!changeset?.text) return []
    const { summary, details } = summarise(changeset.text)
    const debut = summary.match(FIRST_RELEASE)?.[1]
    if (debut)
      return firstReleaseWarnings(debut, details).map((message) => ({
        file,
        message
      }))

    const bumps = Object.entries(changeset.bumps)
      .filter(([name]) => tracked.has(name))
      .map(([, bump]) => bump)
    const bump: Bump | undefined = bumps.includes('major')
      ? 'major'
      : bumps.includes('minor')
        ? 'minor'
        : undefined
    if (bump !== 'minor' || classify(summary, bump) !== 'new') return []
    const lead = summary.match(ADDS_LOOSELY)
    const opening = lead && openingNames(summary.slice(lead[0].length))
    const name = opening?.names[0]
    if (!name || !ownPage(name, index) || !ENDS_NAMING.test(opening.rest))
      return []
    const change = toChange(
      {
        id: file,
        text: changeset.text,
        bump,
        packages: Object.keys(changeset.bumps)
      },
      index
    )
    if (cardOf(change, index, () => undefined)) return []
    return [
      {
        file,
        message: `Adds \`${name}\`, which has its own docs page, but won't become a highlight card on the changelog. ${CARD_FORM} For example: "Add \`${name}\`, a …".`
      }
    ]
  })
}
