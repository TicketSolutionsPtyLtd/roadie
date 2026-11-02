import { presetOf } from './presets'

const hero = {
  name: 'hero',
  title: 'Hero',
  description: 'Opens a page.',
  presets: [
    {
      name: 'page-hero',
      title: 'Page hero',
      description: ''
    },
    {
      name: 'page-header',
      title: 'Page header',
      description: ''
    }
  ]
}

describe('presetOf', () => {
  it('finds the preset named', () => {
    expect(presetOf(hero, 'page-header').name).toBe('page-header')
  })

  it("falls back to the block's first preset for none or an unknown name", () => {
    expect(presetOf(hero, undefined).name).toBe('page-hero')
    expect(presetOf(hero, 'retired').name).toBe('page-hero')
  })
})
