import ts from 'typescript'

import { moduleExports } from './exports'
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
      ['quoted']: string
      [2]: string
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

    export type MenuTotalsShape = { label: string }
    export type MenuTotals = true | MenuTotalsShape
    export type MenuEntry = { name: string }
    export type MenuEntries = readonly MenuEntry[]
    type MenuInternal = { secret: string }
    export type { MenuInternal as MenuPublic }

    export type MenuContext = { index: number }
    export type MenuResult = { html: string }
    export type MenuConfirm = { title: string }
    export type MenuLoaded = { count: number }
    export type MenuMade = { id: string }

    export type MenuHooks = {
      render?: (context: MenuContext) => MenuResult
      options?: { confirm?: MenuConfirm }
      load?: Promise<MenuLoaded>
      make?: new (context: MenuContext) => MenuMade
    }

    export type MenuBase = { a: string; b: string }

    export type MenuWrapped = {
      base?: Omit<MenuBase, 'b'>
      pick?: () => Pick<MenuBase, 'a'>
      partial?: Partial<MenuBase>
      complete?: Required<MenuBase>
    }

    export type MenuOptions = {
      size: 'sm' | 'md' | undefined
      tone: 'a' | null
      onPick?: (value: string) => string
      onEither?: ((value: string) => void) | ((value: number) => void)
    }

    export type MenuDoc = { type: string; [key: string]: unknown }

    export type MenuPanel = {
      totals?: MenuTotals
      entries: MenuEntries
      internal?: MenuInternal
      value: string | undefined
    }
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

const IMPORTS: Record<string, string> = {
  [SOURCE]: '@fixture/blocks/menu',
  [VALUES]: '@fixture/blocks/values'
}

function read(names: string[], files = [SOURCE]) {
  const built = program()
  const sources = files.map((file) => ({
    import: IMPORTS[file]!,
    symbols: moduleExports(built, file).typeSymbols
  }))
  return readTypes(built, sources, names)
}

describe('readTypes', () => {
  it("keeps a type's own and Base UI fields, not those it takes from the DOM or React", () => {
    expect(read(['MenuProps'])).toEqual([
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
    expect(read(['MenuItem'])[0]?.fields).toEqual([
      { name: 'first', type: '"b"' },
      { name: 'second', type: '"a" | "b"' },
      { name: 'loudness', type: '"loud"' },
      { name: 'tone', type: '"quiet" | "loud"' },
      { name: 'edge', type: '"end"' },
      { name: 'align', type: '"start" | "end"' },
      { name: 'nullable', type: '"y" | "x"' }
    ])
  })

  it('marks a deprecated field, keeps a literal computed key, and leaves out a symbol-keyed one, which has no name to set', () => {
    expect(read(['MenuState'])[0]?.fields).toEqual([
      { name: 'quoted', type: 'string', required: true },
      { name: '2', type: 'string', required: true },
      { name: 'shown', type: 'boolean', deprecated: 'Use `open`.' }
    ])
  })

  it('follows a field to the exported type it names, once, even when a type names itself', () => {
    expect(read(['MenuTree'])).toEqual([
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
    expect(read(['MenuSizes'])[0]?.fields).toEqual([
      { name: 'sm', type: 'number', required: true },
      { name: 'lg', type: 'number', required: true }
    ])
  })

  it('describes a type that shares its name with a value', () => {
    expect(read(['MenuDefaults'])[0]?.fields).toEqual([
      { name: 'open', type: 'boolean', required: true }
    ])
  })

  it('describes the fields of a type re-exported from another package', () => {
    expect(read(['DocNode'])).toEqual([
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
    expect(read(['MenuRecord'])).toEqual([
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
    expect(read(['MenuStore'])[0]?.fields).toEqual([
      { name: 'size', type: 'number', required: true }
    ])
  })

  it('takes a type from the subpath that exports it as a type, past one exporting a value of that name', () => {
    expect(read(['MenuChoice'], [VALUES, SOURCE])).toEqual([
      {
        name: 'MenuChoice',
        import: '@fixture/blocks/menu',
        fields: [{ name: 'value', type: 'string', required: true }]
      }
    ])
  })

  it('follows a field through a union alias, an array alias and a renamed re-export, and keeps undefined on a required field', () => {
    expect(read(['MenuPanel'])).toEqual([
      {
        name: 'MenuEntry',
        import: '@fixture/blocks/menu',
        fields: [{ name: 'name', type: 'string', required: true }]
      },
      {
        name: 'MenuInternal',
        import: '@fixture/blocks/menu',
        export: 'MenuPublic',
        fields: [{ name: 'secret', type: 'string', required: true }]
      },
      {
        name: 'MenuPanel',
        import: '@fixture/blocks/menu',
        fields: [
          { name: 'totals', type: 'MenuTotals' },
          { name: 'entries', type: 'MenuEntries', required: true },
          { name: 'internal', type: 'MenuInternal' },
          { name: 'value', type: 'string | undefined', required: true }
        ]
      },
      {
        name: 'MenuTotalsShape',
        import: '@fixture/blocks/menu',
        fields: [{ name: 'label', type: 'string', required: true }]
      }
    ])
  })

  it('follows a field into a function, a constructor, an inline object and a generic type', () => {
    expect(read(['MenuHooks']).map((type) => type.name)).toEqual([
      'MenuConfirm',
      'MenuContext',
      'MenuHooks',
      'MenuLoaded',
      'MenuMade',
      'MenuResult'
    ])
  })

  it('describes no type a field or prop only reaches through Omit, Pick or Partial, whose shape differs', () => {
    expect(read(['MenuWrapped']).map((type) => type.name)).toEqual([
      'MenuWrapped'
    ])
    expect(read(["Omit<MenuBase, 'b'> & { c: string }"])).toEqual([])
    expect(read(["Partial<Pick<MenuBase, 'a'>>"])).toEqual([])
  })

  it('keeps undefined and null on a required field of fixed options, and unwraps an optional function', () => {
    expect(read(['MenuOptions'])[0]?.fields).toEqual([
      { name: 'size', type: '"sm" | "md" | undefined', required: true },
      { name: 'tone', type: '"a" | null', required: true },
      { name: 'onPick', type: '(value: string) => string' },
      {
        name: 'onEither',
        type: '((value: string) => void) | ((value: number) => void)'
      }
    ])
  })

  it('says when a type also takes keys it does not name', () => {
    expect(read(['MenuDoc'])).toEqual([
      {
        name: 'MenuDoc',
        import: '@fixture/blocks/menu',
        additionalFields: 'unknown',
        fields: [{ name: 'type', type: 'string', required: true }]
      }
    ])
  })

  it('finds a renamed re-export by the name a prop prints it with', () => {
    expect(read(['MenuInternal'])).toEqual([
      {
        name: 'MenuInternal',
        import: '@fixture/blocks/menu',
        export: 'MenuPublic',
        fields: [{ name: 'secret', type: 'string', required: true }]
      }
    ])
  })

  it('follows a union alias a prop names to the object types inside it', () => {
    expect(read(['MenuTotals'])).toEqual([
      {
        name: 'MenuTotalsShape',
        import: '@fixture/blocks/menu',
        fields: [{ name: 'label', type: 'string', required: true }]
      }
    ])
  })

  it.each([
    ['a union of literals, which its props already list', 'MenuSide'],
    ['a function type', 'MenuFormat'],
    ['a type the package does not export', 'MenuHidden'],
    ['a string literal that spells a type name', '"MenuGroup"']
  ])('describes no %s', (_, name) => {
    expect(read([name])).toEqual([])
  })
})
