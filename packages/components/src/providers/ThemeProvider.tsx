'use client'

import * as React from 'react'

import { type ScaleResult, generateRadixScale } from '@oztix/roadie-core/colors'

const DEFAULT_ACCENT = '#0091EB' // Oztix Blue

interface AccentContextType {
  accentColor: string
  setAccentColor: (color: string) => void
  scaleResult: ScaleResult | null
}

const AccentContext = React.createContext<AccentContextType | undefined>(
  undefined
)

export interface ThemeProviderProps {
  children: React.ReactNode
  defaultAccentColor?: string
  defaultDark?: boolean
}

/**
 * Generate a <style> tag string for server-side rendering.
 * Inject into <head> to prevent FOUC for dynamic accent colors.
 */
export function getAccentStyleTag(
  accentHex: string,
  id = 'roadie-accent-theme'
): string {
  const result = generateRadixScale(accentHex)

  const lightVars = result.light
    .map((hex, i) => `--color-accent-${i}: ${hex};`)
    .join('\n    ')
  const darkVars = result.dark
    .map((hex, i) => `--color-accent-${i}: ${hex};`)
    .join('\n    ')

  return `<style id="${id}">
  :root {
    ${lightVars}
  }
  .dark {
    ${darkVars}
  }
</style>`
}

export function ThemeProvider({
  children,
  defaultAccentColor = DEFAULT_ACCENT
}: ThemeProviderProps) {
  const [accentColor, setAccentColor] = React.useState(defaultAccentColor)
  const [scaleResult, setScaleResult] = React.useState<ScaleResult | null>(null)

  React.useEffect(() => {
    const result = generateRadixScale(accentColor)
    setScaleResult(result)

    const lightVars = result.light
      .map((hex, i) => `--color-accent-${i}: ${hex};`)
      .join('\n')
    const darkVars = result.dark
      .map((hex, i) => `--color-accent-${i}: ${hex};`)
      .join('\n')

    const css = `
      :root {
        ${lightVars}
      }
      .dark {
        ${darkVars}
      }
    `

    let style = document.getElementById('roadie-accent-theme')
    if (!style) {
      style = document.createElement('style')
      style.id = 'roadie-accent-theme'
      document.head.appendChild(style)
    }
    style.textContent = css
  }, [accentColor])

  return (
    <AccentContext.Provider
      value={{ accentColor, setAccentColor, scaleResult }}
    >
      {children}
    </AccentContext.Provider>
  )
}

export function useAccent() {
  const context = React.useContext(AccentContext)
  if (!context) {
    throw new Error('useAccent must be used within a ThemeProvider')
  }
  return context
}
