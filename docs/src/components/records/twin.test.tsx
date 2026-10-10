import type { ReactNode } from 'react'

import { describe, it, vi } from 'vitest'

import { expectRendersCode } from '@/lib/twinTestUtils'

import { QuerySuggestions } from './QuerySuggestions'
import { ViewMeilisearch } from './ViewMeilisearch'
import { ViewSearchParams } from './ViewSearchParams'
import {
  querySuggestionsExample,
  viewMeilisearchExample,
  viewSearchParamsExample
} from './example'

vi.mock('@/components/CodePreview', () => ({
  CodePreview: ({ children }: { children: ReactNode }) => <pre>{children}</pre>
}))

describe('records outputs match their markdown twin', () => {
  it.each([
    [
      'QuerySuggestions',
      <QuerySuggestions key='a' />,
      querySuggestionsExample()
    ],
    ['ViewMeilisearch', <ViewMeilisearch key='b' />, viewMeilisearchExample()],
    [
      'ViewSearchParams',
      <ViewSearchParams key='c' />,
      viewSearchParamsExample()
    ]
  ])('%s', (_, element, code) => expectRendersCode(element, code))
})
