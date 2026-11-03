import { onTestFinished, vi } from 'vitest'

import { presetOf } from './presets'

const hero = {
  name: 'hero',
  title: 'Hero',
  description: 'Opens a page.',
  group: 'open' as const,
  presets: [
    {
      name: 'page-hero',
      title: 'Page hero',
      description: '',
      fields: ['title']
    },
    {
      name: 'page-header',
      title: 'Page header',
      description: '',
      fields: ['title']
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

  it("ignores the invisible characters a live preview adds to a preset's name", () => {
    expect(presetOf(hero, 'page-\u200Bheader\uFEFF').name).toBe('page-header')
  })

  it('warns once in development when a preset name matches none', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    onTestFinished(() => warn.mockRestore())

    presetOf(hero, 'archived')
    presetOf(hero, 'archived')
    presetOf(hero, undefined)
    presetOf(hero, 'page-header')

    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]![0]).toContain('archived')
  })
})
