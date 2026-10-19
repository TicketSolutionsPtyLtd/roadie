import type { ReactNode } from 'react'

import Link from 'next/link'

import type { PhrasingContent, RootContent } from 'mdast'
import remarkParse from 'remark-parse'
import { unified } from 'unified'

import { Code } from '@oztix/roadie-components/code'

const parser = unified().use(remarkParse)

function phrasing(nodes: PhrasingContent[]): ReactNode[] {
  return nodes.map((node, index) => {
    switch (node.type) {
      case 'text':
        return node.value
      case 'inlineCode':
        return <Code key={index}>{node.value}</Code>
      case 'strong':
      case 'emphasis':
        return phrasing(node.children)
      case 'break':
        return ' '
      case 'link':
        return node.url.startsWith('/') ? (
          <Link key={index} href={node.url} className='underline'>
            {phrasing(node.children)}
          </Link>
        ) : (
          <a
            key={index}
            href={node.url}
            target='_blank'
            rel='noopener noreferrer'
            className='underline'
          >
            {phrasing(node.children)}
          </a>
        )
      default:
        return 'value' in node ? node.value : null
    }
  })
}

function block(node: RootContent, index: number): ReactNode {
  switch (node.type) {
    case 'paragraph':
    case 'heading':
      return <p key={index}>{phrasing(node.children)}</p>
    case 'list':
      return (
        <ul key={index} className='grid list-disc gap-1 pl-5'>
          {node.children.map((item, itemIndex) => (
            <li key={itemIndex}>
              {item.children.flatMap((child) =>
                child.type === 'paragraph' ? phrasing(child.children) : []
              )}
            </li>
          ))}
        </ul>
      )
    case 'code':
      return (
        <pre
          key={index}
          className='overflow-x-auto rounded-lg bg-subtle p-3 text-sm'
        >
          <code>{node.value}</code>
        </pre>
      )
    default:
      return null
  }
}

/** A changeset's first sentence, with its inline code, as inline content. */
export function ChangeSummary({ markdown }: { markdown: string }) {
  const [first] = parser.parse(markdown).children
  return first?.type === 'paragraph' ? phrasing(first.children) : markdown
}

/** The rest of a changeset: paragraphs, lists, and code. */
export function ChangeDetails({ markdown }: { markdown: string }) {
  return parser.parse(markdown).children.map(block)
}
