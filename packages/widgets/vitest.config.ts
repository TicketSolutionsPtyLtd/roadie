import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import vue from '@vitejs/plugin-vue'
import { playwright } from '@vitest/browser-playwright'
import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'
import { BaseSequencer, type BrowserCommand } from 'vitest/node'

import {
  browserInstances,
  browserRetry,
  browserRunOptions,
  quarantineInclude,
  sizeBalanced
} from '../../vitest.browsers.config.ts'

type PointerStep =
  | { type: 'move'; x: number; y: number }
  | { type: 'down' | 'up' }

// A real mouse, so the drawer sees the browser's own events, click included.
// Points are in the test frame's CSS pixels; the frame may sit offset and scaled.
const pointer: BrowserCommand<[steps: PointerStep[]]> = async (
  { page, frame },
  steps
) => {
  const testFrame = await frame()
  const box = await (await testFrame.frameElement()).boundingBox()
  if (!box) throw new Error('The test frame has no box')
  const width = await testFrame.evaluate(() => window.innerWidth)
  const scale = box.width / width
  for (const step of steps) {
    if (step.type === 'move')
      await page.mouse.move(box.x + step.x * scale, box.y + step.y * scale)
    else if (step.type === 'down') await page.mouse.down()
    else await page.mouse.up()
  }
}

const BROWSER_TESTS = 'src/**/*.browser.test.{ts,tsx}'
const ROOT = fileURLToPath(new URL('./', import.meta.url))

export default defineConfig({
  plugins: [react(), vue()],
  resolve: { dedupe: ['react', 'react-dom', 'vue'] },
  server: { fs: { allow: ['../..'] } },
  test: {
    ...browserRunOptions,
    sequence: { sequencer: sizeBalanced(BaseSequencer) },
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
          exclude: [...configDefaults.exclude, BROWSER_TESTS],
          // React + Base UI Popover transitions + async refetch run slowly in jsdom;
          // the heavier cart-drawer flows brush past the 5s default on slower CI
          // runners (locally ~3-5s). 15s gives headroom without masking a real hang.
          testTimeout: 15000
        }
      },
      {
        extends: true,
        plugins: [tailwindcss()],
        optimizeDeps: {
          include: [
            '@number-flow/react',
            '@number-flow/vue',
            '@phosphor-icons/react',
            '@phosphor-icons/vue',
            '@tanstack/react-query',
            '@testing-library/react',
            'focus-trap',
            'motion',
            'motion/react',
            'react-dom',
            'react-dom/client',
            'react-focus-lock',
            'react/jsx-dev-runtime',
            'react/jsx-runtime',
            'vue'
          ]
        },
        test: {
          name: 'browser',
          include: quarantineInclude(ROOT, [BROWSER_TESTS]),
          retry: browserRetry,
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            viewport: { width: 1280, height: 800 },
            commands: { pointer },
            instances: browserInstances
          }
        }
      }
    ]
  },
  ssr: { noExternal: ['@oztix/roadie-core'] }
})
