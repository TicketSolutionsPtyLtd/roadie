import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll } from 'vitest'

import { preloadEditor } from './src/Editor/load'

// A file's first test would otherwise wait out the editor's cold load.
beforeAll(async () => {
  await preloadEditor()
})

afterEach(() => {
  cleanup()
})
