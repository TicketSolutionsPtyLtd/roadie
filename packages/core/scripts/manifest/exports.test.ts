import { exportEntries } from './exports'

describe('exportEntries', () => {
  it('lists a static file subpath as an asset, with no source to read', () => {
    expect(
      exportEntries({ './thumbnails/*': './src/thumbnails/*' }, '/nowhere')
    ).toEqual([
      { subpath: './thumbnails/*', target: './src/thumbnails/*', kind: 'asset' }
    ])
  })
})
