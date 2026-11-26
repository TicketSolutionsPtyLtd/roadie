import { manifestEntries } from './exports'

describe('manifestEntries', () => {
  it('needs a source for a JavaScript subpath outside dist', () => {
    expect(() =>
      manifestEntries({ './widget': './src/widget.js' }, '/nowhere')
    ).toThrow('No source for export target ./src/widget.js')
  })
})
