import { exportEntries } from './exports'

describe('exportEntries', () => {
  it.each([
    ['./thumbnails/*', './src/thumbnails/*'],
    ['./icons/*', './dist/icons/*.svg']
  ])(
    'lists the file subpath %s as an asset, with no source to read',
    (subpath, target) => {
      expect(exportEntries({ [subpath]: target }, '/nowhere')).toEqual([
        { subpath, target, kind: 'asset' }
      ])
    }
  )

  it('still needs a source for a JavaScript subpath outside dist', () => {
    expect(() =>
      exportEntries({ './widget': './src/widget.js' }, '/nowhere')
    ).toThrow('No source for export target ./src/widget.js')
  })
})
