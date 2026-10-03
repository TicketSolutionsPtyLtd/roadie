import { describe, expect, it } from 'vitest'

import { rankMatches } from './rankMatches'

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
      items: ['Nightjar', 'Mid-night'],
      query: 'night',
      expected: ['Nightjar', 'Mid-night']
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
