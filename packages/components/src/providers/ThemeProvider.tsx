'use client'

import * as React from 'react'

import {
  type ScaleResult,
  generateAccentScale,
  generateNeutralScale,
  getOklchChroma,
  getOklchHue
} from '@oztix/roadie-core/colors'

const DEFAULT_ACCENT = '#0091EB' // Oztix Blue

const supportsOklch =
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports('color', 'oklch(0 0 0)')

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
 * Sets --accent-hue and --accent-chroma for CSS-native theming,
 * plus hex fallbacks for older browsers.
 */
export function getAccentStyleTag(
  accentHex: string,
  id = 'roadie-accent-theme'
): string {
  const result = generateAccentScale(accentHex)
  const neutral = generateNeutralScale(accentHex)
  const hue = Math.round(getOklchHue(accentHex))
  const chroma = +getOklchChroma(accentHex).toFixed(4)

  // Hex fallbacks for accent (non-oklch browsers)
  const accentVars = result.light
    .map((hex, i) => `--color-accent-${i}: ${hex};`)
    .join('\n    ')
  const darkAccentVars = result.dark
    .map((hex, i) => `--color-accent-${i}: ${hex};`)
    .join('\n    ')
  // Hex fallbacks for neutral (non-oklch browsers)
  const neutralVars = neutral.light
    .map((hex, i) => `--color-neutral-${i}: ${hex};`)
    .join('\n    ')
  const darkNeutralVars = neutral.dark
    .map((hex, i) => `--color-neutral-${i}: ${hex};`)
    .join('\n    ')

  return `<style id="${id}">
  :root {
    --accent-hue: ${hue};
    --accent-chroma: ${chroma};
    ${neutralVars}
    ${accentVars}
  }
  .dark {
    ${darkNeutralVars}
    ${darkAccentVars}
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
    const result = generateAccentScale(accentColor)
    setScaleResult(result)

    const hue = Math.round(getOklchHue(accentColor))
    const chroma = +getOklchChroma(accentColor).toFixed(4)

    let css: string

    if (supportsOklch) {
      // Modern browsers: set hue + chroma, CSS oklch() handles the rest
      css = `
        :root {
          --accent-hue: ${hue};
          --accent-chroma: ${chroma};
        }
      `
    } else {
      // Old browsers: generate hex values for accent + neutral
      const neutral = generateNeutralScale(accentColor)
      const accentVars = result.light
        .map((hex, i) => `--color-accent-${i}: ${hex};`)
        .join('\n')
      const darkAccentVars = result.dark
        .map((hex, i) => `--color-accent-${i}: ${hex};`)
        .join('\n')
      const neutralVars = neutral.light
        .map((hex, i) => `--color-neutral-${i}: ${hex};`)
        .join('\n')
      const darkNeutralVars = neutral.dark
        .map((hex, i) => `--color-neutral-${i}: ${hex};`)
        .join('\n')

      css = `
        :root {
          ${neutralVars}
          ${accentVars}
        }
        .dark {
          ${darkNeutralVars}
          ${darkAccentVars}
        }
      `
    }

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
