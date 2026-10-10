// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'

import { regionName } from './scroll-region'

const scrollerIn = (html: string) => {
  document.body.innerHTML = html
  return document.querySelector('.prose-scroll')!
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('regionName', () => {
  it.each([
    {
      name: 'labels a table by its caption, over a heading',
      html: `<div class="prose"><h2 id="sizes">Sizes</h2>
        <div class="prose-scroll"><table><caption> Ticket tiers </caption></table></div></div>`,
      expected: { 'aria-label': 'Ticket tiers' }
    },
    {
      name: 'points at the nearest heading before the table',
      html: `<div class="prose"><h2 id="tiers">Tiers</h2><h3 id="sizes">Sizes</h3>
        <p>Intro</p><div class="prose-scroll"><table></table></div>
        <h3 id="after">After</h3></div>`,
      expected: { 'aria-labelledby': 'sizes' }
    },
    {
      name: 'finds a heading outside a wrapper the table sits in',
      html: `<div class="prose"><h2 id="tiers">Tiers</h2>
        <div data-slot="guideline"><div class="prose-scroll"><table></table></div></div></div>`,
      expected: { 'aria-labelledby': 'tiers' }
    },
    {
      name: 'skips a heading without an id, and one outside the prose',
      html: `<h1 id="title">Title</h1><div class="prose"><h2>No id</h2>
        <div class="prose-scroll"><table></table></div></div>`,
      expected: { 'aria-label': 'Table' }
    },
    {
      name: 'ignores the caption of a table nested in a cell',
      html: `<div class="prose"><h2 id="tiers">Tiers</h2><div class="prose-scroll">
        <table><tr><td><table><caption>Inner</caption></table></td></tr></table></div></div>`,
      expected: { 'aria-labelledby': 'tiers' }
    }
  ])('$name', ({ html, expected }) => {
    expect(regionName(scrollerIn(html))).toEqual(expected)
  })

  it('numbers each table after the first under the same heading, so region names stay unique', () => {
    document.body.innerHTML = `<div class="prose"><h2 id="tiers">Tiers</h2>
      <div class="prose-scroll"><table></table></div>
      <div class="prose-scroll"><table></table></div>
      <h2 id="sizes">Sizes</h2><div class="prose-scroll"><table></table></div></div>`
    expect(
      [...document.querySelectorAll('.prose-scroll')].map(regionName)
    ).toEqual([
      { 'aria-labelledby': 'tiers' },
      { 'aria-label': 'Tiers, table 2' },
      { 'aria-labelledby': 'sizes' }
    ])
  })
})
