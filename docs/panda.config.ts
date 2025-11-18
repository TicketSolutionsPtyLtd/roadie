import { defineConfig } from '@pandacss/dev'

import { roadie } from '@oztix/roadie-core/presets'

interface ParserHookParams {
  content: string
  filePath: string | undefined
}

export default defineConfig({
  presets: [roadie],
  importMap: '@oztix/roadie-core',
  lightningcss: true,
  include: [
    './node_modules/@oztix/roadie-components/src/**/*.tsx',
    './src/components/**/*.{ts,tsx,js,jsx}',
    './src/app/**/*.{ts,tsx,js,jsx,mdx}',
    './mdx-components.tsx'
  ],
  hooks: {
    'parser:before': ({ content, filePath }: ParserHookParams) => {
      if (!filePath?.endsWith('.mdx')) return content
      // this is needed to extract the code blocks from the mdx file
      // so that the Panda CSS parser will process them
      const codeBlockRegex = /```tsx\s*live\s*([\s\S]*?)```/g
      const matches = content.matchAll(codeBlockRegex)
      const codeBlocks = Array.from(matches)
        .map((match: RegExpMatchArray) => match[1])
        .join('\n')
      // Return both the original content and the extracted code blocks
      return `${content}\n${codeBlocks}`
    }
  },
  staticCss: {
    css: [
      {
        properties: {
          boxSize: ['*']
        }
      }
    ]
  },
  outdir: 'roadie-core',
  outExtension: 'js',
  clean: true,
  jsxFramework: 'react'
})
