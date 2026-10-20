import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll } from 'vitest'

import { preloadEditor } from './src/Editor/load'

// Testing Library's own beforeAll turns act warnings on. A real browser isn't
// an act environment: the tests wait for states, and Tiptap and Base UI update
// after every event, which logged about 12,000 warnings a run.
beforeAll(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false })
})

// A file's first test would otherwise wait out the editor's cold load.
beforeAll(async () => {
  await preloadEditor()
})

afterEach(() => {
  cleanup()
})
