import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { Editor, type EditorProps } from '.'
import type { EditorValue } from '../schema'

// Any of these loading means the server pays for Tiptap, so each throws.
vi.mock('@tiptap/core', () => {
  throw new Error('@tiptap/core loaded with the editor shell')
})
vi.mock('@tiptap/react', () => {
  throw new Error('@tiptap/react loaded with the editor shell')
})
vi.mock('@tiptap/starter-kit', () => {
  throw new Error('@tiptap/starter-kit loaded with the editor shell')
})
vi.mock('@tiptap/extensions', () => {
  throw new Error('@tiptap/extensions loaded with the editor shell')
})

describe('Editor on the server', () => {
  it('renders a skeleton, with no editable content and no Tiptap', () => {
    const html = renderToString(
      <Editor aria-label='Event description' placeholder='Doors, lineup' />
    )

    expect(html).toContain('data-slot="skeleton"')
    expect(html).not.toContain('contenteditable')
    expect(html).not.toContain('role="textbox"')
  })

  it('keeps a named value in the form until the editor loads', () => {
    const value = {
      version: 1,
      preset: 'basic' as const,
      doc: { type: 'doc', content: [{ type: 'paragraph' }] }
    }
    const html = renderToString(
      <form>
        <Editor
          aria-label='Event description'
          name='description'
          defaultValue={value}
        />
      </form>
    )
    const input = html.match(/<input[^>]*name="description"[^>]*>/)?.[0]

    expect(input).toContain('type="hidden"')
    const submitted = input!.match(/value="([^"]*)"/)![1]!
    expect(JSON.parse(submitted.replaceAll('&quot;', '"'))).toEqual(value)
  })

  it.each<[string, EditorProps, EditorValue]>([
    [
      'an empty value without one',
      {},
      {
        version: 1,
        preset: 'basic',
        doc: { type: 'doc', content: [{ type: 'paragraph' }] }
      }
    ],
    [
      'a value in another preset, read into basic',
      {
        defaultValue: {
          version: 1,
          preset: 'rich',
          doc: {
            type: 'doc',
            content: [
              {
                type: 'heading',
                attrs: { level: 2 },
                content: [
                  {
                    type: 'text',
                    marks: [{ type: 'link', attrs: { href: 'javascript:x' } }],
                    text: 'Lineup'
                  }
                ]
              }
            ]
          }
        }
      },
      {
        version: 1,
        preset: 'basic',
        doc: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', marks: [], text: 'Lineup' }]
            }
          ]
        }
      }
    ]
  ])(
    'submits %s before the editor loads, as the loaded editor would',
    (_, props, expected) => {
      const html = renderToString(
        <Editor aria-label='Event description' name='description' {...props} />
      )
      const input = html.match(/<input[^>]*name="description"[^>]*>/)?.[0]
      const submitted = input!.match(/value="([^"]*)"/)![1]!

      expect(JSON.parse(submitted.replaceAll('&quot;', '"'))).toEqual(expected)
    }
  )

  it('is the same component as Editor.Root', () => {
    expect(Editor.Root).toBe(Editor)
  })
})
