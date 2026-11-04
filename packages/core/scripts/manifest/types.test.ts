import ts from 'typescript'

import { readTypes } from './types'

const SOURCE = '/repo/packages/blocks/src/menu.ts'
const VALUES = '/repo/packages/blocks/src/values.ts'
const FILES: Record<string, string> = {
  '/repo/node_modules/dom-fake/index.d.ts':
    'export type HTMLAttributes = { id?: string; title?: string }',
  '/repo/node_modules/@base-ui/react/index.d.ts':
    "export type PopupProps = { side?: 'top' | 'bottom' }",
  '/repo/node_modules/doc-fake/index.d.ts':
    '/** A document node. */ export type DocNode = { type?: string; content?: DocNode[] }',
  '/repo/packages/blocks/src/tone.ts':
    "export type MenuTone = 'quiet' | 'loud'",
  [VALUES]: "export const MenuChoice = 'first'",
  [SOURCE]: `
    import type { HTMLAttributes } from 'dom-fake'
    import type { PopupProps } from '@base-ui/react'
    import type { MenuTone } from './tone'

    export type { DocNode } from 'doc-fake'

    const brand: unique symbol = Symbol('menu')

    /** A menu's own props, on top of its element's. */
    export type MenuProps = HTMLAttributes & PopupProps & {
      /** Opens the menu. */
      open?: boolean
      ref?: unknown
      label?: MenuLabel
    }

    type MenuLabel = string | { text: string } | null | undefined

    export type MenuSide = 'start' | 'end'

    export type MenuItem = {
      first?: 'b'
      second?: 'a' | 'b' | undefined
      loudness?: 'loud'
      tone?: MenuTone
      edge?: 'end'
      align?: ('start' | 'end')
      nullable?: 'y' | 'x' | null
    }

    export type MenuState = {
      readonly [brand]: true
      /** @deprecated Use \`open\`. */
      shown?: boolean
    }

    export type MenuGroup = { title: string }

    export type MenuTree = {
      label: string
      children?: readonly MenuTree[]
      group?: MenuGroup
    }

    export type MenuSizes = Record<'sm' | 'lg', number>

    export const MenuDefaults = { open: false }
    export type MenuDefaults = { open: boolean }

    export type MenuFormat = (label: string) => string

    export type MenuRow = { id: string }

    /** A row of any shape. */
    export type MenuRecord<MenuRow> = { row: MenuRow; label: string }

    export type MenuStore = {
      ' subscribe': () => void
      size: number
    }

    export type MenuChoice = { value: string }
  `
}

function program() {
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler
  }
  const host = ts.createCompilerHost(options)
  const getSourceFile = host.getSourceFile.bind(host)
  const fileExists = host.fileExists.bind(host)
  host.getSourceFile = (fileName, languageVersion, ...rest) =>
    fileName in FILES
      ? ts.createSourceFile(fileName, FILES[fileName]!, languageVersion)
      : getSourceFile(fileName, languageVersion, ...rest)
  const directoryExists = host.directoryExists?.bind(host)
  host.fileExists = (fileName) => fileName in FILES || fileExists(fileName)
  host.directoryExists = (directory) =>
    Object.keys(FILES).some((file) => file.startsWith(`${directory}/`)) ||
    (directoryExists?.(directory) ?? false)
  return ts.createProgram([SOURCE, VALUES], options, host)
}

const sources = [
  { subpath: './menu', import: '@fixture/blocks/menu', source: SOURCE }
]

describe('readTypes', () => {
  it("keeps a type's own and Base UI fields, not those it takes from the DOM or React", () => {
    expect(readTypes(program(), sources, ['MenuProps'])).toEqual([
      {
        name: 'MenuProps',
        import: '@fixture/blocks/menu',
        description: "A menu's own props, on top of its element's.",
        fields: [
          { name: 'side', type: '"top" | "bottom"' },
          { name: 'open', type: 'boolean', description: 'Opens the menu.' },
          { name: 'label', type: 'MenuLabel' }
        ]
      }
    ])
  })

  it('lists a union of literals in the order it is declared, through an imported alias, parentheses, and null', () => {
    expect(readTypes(program(), sources, ['MenuItem'])[0]?.fields).toEqual([
      { name: 'first', type: '"b"' },
      { name: 'second', type: '"a" | "b"' },
      { name: 'loudness', type: '"loud"' },
      { name: 'tone', type: '"quiet" | "loud"' },
      { name: 'edge', type: '"end"' },
      { name: 'align', type: '"start" | "end"' },
      { name: 'nullable', type: '"y" | "x"' }
    ])
  })

  it('marks a deprecated field and leaves out a symbol-keyed one, which has no name to set', () => {
    expect(readTypes(program(), sources, ['MenuState'])[0]?.fields).toEqual([
      { name: 'shown', type: 'boolean', deprecated: 'Use `open`.' }
    ])
  })

  it('follows a field to the exported type it names, once, even when a type names itself', () => {
    expect(readTypes(program(), sources, ['MenuTree'])).toEqual([
      {
        name: 'MenuGroup',
        import: '@fixture/blocks/menu',
        fields: [{ name: 'title', type: 'string', required: true }]
      },
      {
        name: 'MenuTree',
        import: '@fixture/blocks/menu',
        fields: [
          { name: 'label', type: 'string', required: true },
          { name: 'children', type: 'readonly MenuTree[]' },
          { name: 'group', type: 'MenuGroup' }
        ]
      }
    ])
  })

  it('describes the fields of a mapped type', () => {
    expect(readTypes(program(), sources, ['MenuSizes'])[0]?.fields).toEqual([
      { name: 'sm', type: 'number', required: true },
      { name: 'lg', type: 'number', required: true }
    ])
  })

  it('describes a type that shares its name with a value', () => {
    expect(readTypes(program(), sources, ['MenuDefaults'])[0]?.fields).toEqual([
      { name: 'open', type: 'boolean', required: true }
    ])
  })

  it('describes the fields of a type re-exported from another package', () => {
    expect(readTypes(program(), sources, ['DocNode'])).toEqual([
      {
        name: 'DocNode',
        import: '@fixture/blocks/menu',
        description: 'A document node.',
        fields: [
          { name: 'type', type: 'string' },
          { name: 'content', type: 'DocNode[]' }
        ]
      }
    ])
  })

  it("names a generic type's parameters, and follows none of them to a type of the same name", () => {
    expect(readTypes(program(), sources, ['MenuRecord'])).toEqual([
      {
        name: 'MenuRecord',
        import: '@fixture/blocks/menu',
        description: 'A row of any shape.',
        typeParameters: ['MenuRow'],
        fields: [
          { name: 'row', type: 'MenuRow', required: true },
          { name: 'label', type: 'string', required: true }
        ]
      }
    ])
  })

  it('leaves out a key that starts with a space, which a library keeps for itself', () => {
    expect(readTypes(program(), sources, ['MenuStore'])[0]?.fields).toEqual([
      { name: 'size', type: 'number', required: true }
    ])
  })

  it('takes a type from the subpath that exports it as a type, past one exporting a value of that name', () => {
    const values = {
      subpath: './values',
      import: '@fixture/blocks/values',
      source: VALUES
    }
    expect(readTypes(program(), [values, ...sources], ['MenuChoice'])).toEqual([
      {
        name: 'MenuChoice',
        import: '@fixture/blocks/menu',
        fields: [{ name: 'value', type: 'string', required: true }]
      }
    ])
  })

  it.each([
    ['a union of literals, which its props already list', 'MenuSide'],
    ['a function type', 'MenuFormat'],
    ['a type the package does not export', 'MenuHidden'],
    ['a string literal that spells a type name', '"MenuGroup"']
  ])('describes no %s', (_, name) => {
    expect(readTypes(program(), sources, [name])).toEqual([])
  })
})
