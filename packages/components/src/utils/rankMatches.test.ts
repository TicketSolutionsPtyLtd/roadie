import { describe, expect, it } from 'vitest'

import { collatorContains, rankMatches } from './rankMatches'

describe('rankMatches', () => {
  it.each([
    {
      name: 'puts an exact match first',
      items: ['Hard rock', 'Rock'],
      query: 'Rock',
      expected: ['Rock', 'Hard rock']
    },
    {
      name: 'puts the start of the label before the start of a word',
      items: ['Hard rock', 'Rockabilly'],
      query: 'rock',
      expected: ['Rockabilly', 'Hard rock']
    },
    {
      name: 'puts the start of a word before the middle of one',
      items: ['Bedrock jam', 'Garage rock', 'Hard rock'],
      query: 'rock',
      expected: ['Garage rock', 'Hard rock', 'Bedrock jam']
    },
    {
      name: 'ranks every tier in order',
      items: ['Bedrock jam', 'Hard rock', 'Rockabilly', 'Rock'],
      query: 'rock',
      expected: ['Rock', 'Rockabilly', 'Hard rock', 'Bedrock jam']
    },
    {
      name: 'keeps the given order within a tier',
      items: ['Surf rock', 'Hard rock', 'Punk rock'],
      query: 'rock',
      expected: ['Surf rock', 'Hard rock', 'Punk rock']
    },
    {
      name: 'ignores case',
      items: ['Sydney Road', 'SYDNEY'],
      query: 'sydney',
      expected: ['SYDNEY', 'Sydney Road']
    },
    {
      name: 'ignores diacritics',
      items: ['Le café', 'Cafe'],
      query: 'café',
      expected: ['Cafe', 'Le café']
    },
    {
      name: 'treats punctuation as a word break',
      items: ['Midnight', 'Mid-night'],
      query: 'night',
      expected: ['Mid-night', 'Midnight']
    },
    {
      name: 'finds a word start after an ignored space',
      items: ['Bedrock band', 'Hard rock'],
      query: 'rock!',
      expected: ['Hard rock', 'Bedrock band']
    },
    {
      name: 'keeps an apostrophe inside a word',
      items: ["Don't", 'Hot tea'],
      query: 't',
      expected: ['Hot tea', "Don't"]
    },
    {
      name: 'starts a word after an opening quote',
      items: ['Bedrock', "The 'Rock' Bar"],
      query: 'rock',
      expected: ["The 'Rock' Bar", 'Bedrock']
    },
    {
      name: "starts a word after O'",
      items: ['Xrock', "O'Rock", 'O’Rock'],
      query: 'rock',
      expected: ["O'Rock", 'O’Rock', 'Xrock']
    },
    {
      name: 'reads a letter outside the basic plane as part of a word',
      items: ['𝐀rock', 'Hard rock'],
      query: 'rock',
      expected: ['Hard rock', '𝐀rock']
    },
    {
      name: 'trims the query',
      items: ['Hard rock', 'Rock'],
      query: '  Rock ',
      expected: ['Rock', 'Hard rock']
    },
    {
      name: 'puts items that do not match last, in order',
      items: ['Jazz', 'Hard rock', 'Folk', 'Rock'],
      query: 'rock',
      expected: ['Rock', 'Hard rock', 'Jazz', 'Folk']
    }
  ])('$name', ({ items, query, expected }) => {
    expect(rankMatches(items, query)).toEqual(expected)
  })

  it.each(['', '   '])('keeps the given order for the query %j', (query) => {
    const items = ['Hard rock', 'Rock']
    expect(rankMatches(items, query)).toBe(items)
  })

  it('returns the same array when nothing moves', () => {
    const items = ['Rock', 'Hard rock']
    expect(rankMatches(items, 'rock')).toBe(items)
  })

  it('reads labels from objects the way the filter does', () => {
    const hard = { value: 'hard', label: 'Hard rock' }
    const rock = { value: 'rock', label: 'Rock' }
    const bare = { value: 'Rock' }
    expect(rankMatches([hard, bare], 'rock')).toEqual([bare, hard])
    expect(rankMatches([hard, rock], 'rock')).toEqual([rock, hard])
    const labelled = { value: 'x', label: 'Rock' }
    const valued = { value: 'Rock', label: 'Hard rock' }
    expect(rankMatches([valued, labelled], 'rock')).toEqual([labelled, valued])
  })

  it('reads labels with the given function', () => {
    const items = [{ name: 'Hard rock' }, { name: 'Rock' }]
    expect(
      rankMatches(items, 'rock', (item: { name: string }) => item.name)
    ).toEqual([items[1], items[0]])
  })

  it('ranks within each group and keeps the group order', () => {
    const items = [
      { value: 'Guitar', items: ['Hard rock', 'Rock'] },
      { value: 'Brass', items: ['Ska', 'Jazz'] },
      { value: 'Keys', items: ['Prog rock', 'Rock opera'] }
    ]
    expect(rankMatches(items, 'rock')).toEqual([
      { value: 'Guitar', items: ['Rock', 'Hard rock'] },
      items[1],
      { value: 'Keys', items: ['Rock opera', 'Prog rock'] }
    ])
  })

  it('returns the same groups when nothing moves', () => {
    const items = [{ value: 'Guitar', items: ['Rock', 'Hard rock'] }]
    expect(rankMatches(items, 'rock')).toBe(items)
  })
})

// Base UI's default filter: every window of the label against the query.
function collatorWindows(label: string, query: string, locale?: string) {
  const collator = new Intl.Collator(locale, {
    usage: 'search',
    sensitivity: 'base',
    ignorePunctuation: true
  })
  if (!query) return true
  for (let i = 0; i <= label.length - query.length; i += 1)
    if (collator.compare(label.slice(i, i + query.length), query) === 0)
      return true
  return false
}

// A fixed sequence, so a failure reproduces.
function seeded(seed: number) {
  return () => {
    seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31
    return seed / 2 ** 31
  }
}

describe('collatorContains', () => {
  const words = ['Gumleaf', 'hall', 'KAZOO', 'tin', 'Lantern', '12', 'a', 'B']
  const glue = [' ', '', '  ', "'", '-', 'é', 'ß', '.']
  const random = seeded(7)
  const pick = <T>(list: readonly T[]) =>
    list[Math.floor(random() * list.length)]!
  const phrase = () =>
    Array.from({ length: 1 + Math.floor(random() * 4) }, () => pick(words))
      .map((word, index) => (index ? pick(glue) : '') + word)
      .join('')
  const cases = Array.from({ length: 4000 }, () => {
    const label = phrase()
    const start = Math.floor(random() * label.length)
    const slice = label.slice(start, start + 1 + Math.floor(random() * 8))
    // The collator ignores spaces, so a space moved within the slice matches.
    const at = Math.floor(random() * slice.length)
    const moved = `${slice.slice(0, at).replace(' ', '')} ${slice.slice(at)}`
    const query = [
      slice,
      moved,
      phrase().slice(0, 1 + Math.floor(random() * 10))
    ][Math.floor(random() * 3)]!
    return [label, random() < 0.3 ? query.toUpperCase() : query] as const
  })

  it("agrees with Base UI's collator filter on every label", () => {
    const contains = collatorContains('en-AU')
    const disagree = cases.filter(
      ([label, query]) =>
        contains(label, query) !== collatorWindows(label, query, 'en-AU')
    )
    expect(disagree).toEqual([])
  })

  it('agrees where the locale folds letters its own way', () => {
    const contains = collatorContains('tr')
    expect(contains('Istanbul', 'i')).toBe(
      collatorWindows('Istanbul', 'i', 'tr')
    )
    expect(contains('Istanbul', 'ı')).toBe(
      collatorWindows('Istanbul', 'ı', 'tr')
    )
  })

  it('reads labels the way Base UI does', () => {
    const contains = collatorContains('en-AU')
    expect(contains({ value: 'x', label: 'Gumleaf Hall' }, 'hall')).toBe(true)
    expect(contains({ value: 'Gumleaf Hall' }, 'hall')).toBe(true)
    expect(
      contains({ name: 'Gumleaf Hall' }, 'hall', (item) => item.name)
    ).toBe(true)
    expect(contains('Gumleaf Hall', '')).toBe(true)
  })
})

describe('rankMatches against the collator', () => {
  it('ranks every label the collator matches ahead of every one it does not', () => {
    const random = seeded(11)
    const words = ['Gumleaf', 'hall', 'Kazoo', 'tin', 'Lantern', 'ROOM', '7']
    const items = Array.from({ length: 300 }, (_, index) =>
      Array.from(
        { length: 1 + Math.floor(random() * 3) },
        () => words[Math.floor(random() * words.length)]
      ).join(index % 5 ? ' ' : '-')
    )
    for (const query of ['hall', 'Gumleaf Hall', 'tin lan', 'room 7', 'zoo']) {
      const expected = items.filter((item) => collatorWindows(item, query))
      expect(expected.length).toBeGreaterThan(0)
      const ranked = rankMatches(items, query)
      expect(new Set(ranked.slice(0, expected.length))).toEqual(
        new Set(expected)
      )
    }
  })
})
