import '@testing-library/jest-dom/vitest'
import { act, render, renderHook } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_ACCENT_COLOR,
  InvalidColorError,
  ThemeProvider,
  getAccentStyleSync,
  getAccentStyleTagSync,
  isValidHexColor,
  useTheme
} from './ThemeProvider'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    clear: () => {
      store = {}
    }
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock matchMedia
const matchMediaMock = vi.fn().mockReturnValue({
  matches: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
})
Object.defineProperty(window, 'matchMedia', { value: matchMediaMock })

// Mock CSS.supports for oklch detection
Object.defineProperty(window, 'CSS', {
  value: { supports: vi.fn().mockReturnValue(true) }
})

beforeEach(() => {
  localStorageMock.clear()
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  matchMediaMock.mockClear()
  matchMediaMock.mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })
  document.documentElement.classList.remove('dark')
  document.documentElement.style.colorScheme = ''
})

describe('ThemeProvider', () => {
  it('renders children', () => {
    const { getByText } = render(
      <ThemeProvider>
        <p>Hello</p>
      </ThemeProvider>
    )
    expect(getByText('Hello')).toBeInTheDocument()
  })

  it('defaults to light mode', () => {
    renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>
    })
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('reads dark class from DOM on mount', () => {
    document.documentElement.classList.add('dark')
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>
    })
    expect(result.current.isDark).toBe(true)
  })

  it('reads stored theme from localStorage on mount', () => {
    localStorageMock.setItem('theme', 'dark')
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>
    })
    expect(result.current.isDark).toBe(true)
  })
})

describe('useTheme - setDark', () => {
  it('toggles dark mode on', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>
    })
    act(() => result.current.setDark(true))
    expect(result.current.isDark).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('toggles dark mode off', () => {
    document.documentElement.classList.add('dark')
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>
    })
    act(() => result.current.setDark(false))
    expect(result.current.isDark).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.style.colorScheme).toBe('light')
  })

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>
    })
    act(() => result.current.setDark(true))
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark')

    act(() => result.current.setDark(false))
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light')
  })
})

describe('followSystem', () => {
  it('respects OS dark preference when followSystem is true', () => {
    matchMediaMock.mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => (
        <ThemeProvider followSystem>{children}</ThemeProvider>
      )
    })
    expect(result.current.isDark).toBe(true)
  })

  it('ignores OS preference when followSystem is false', () => {
    matchMediaMock.mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>
    })
    expect(result.current.isDark).toBe(false)
  })

  it('stored preference overrides followSystem', () => {
    localStorageMock.setItem('theme', 'light')
    matchMediaMock.mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => (
        <ThemeProvider followSystem>{children}</ThemeProvider>
      )
    })
    expect(result.current.isDark).toBe(false)
  })

  it('registers matchMedia listener when followSystem is true', () => {
    const addEventListener = vi.fn()
    const removeEventListener = vi.fn()
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener,
      removeEventListener
    })
    const { unmount } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => (
        <ThemeProvider followSystem>{children}</ThemeProvider>
      )
    })
    expect(addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    )
    unmount()
    expect(removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    )
  })

  it('does not register matchMedia listener when followSystem is false', () => {
    const addEventListener = vi.fn()
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener,
      removeEventListener: vi.fn()
    })
    renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>
    })
    expect(addEventListener).not.toHaveBeenCalled()
  })
})

describe('useTheme without provider', () => {
  it('throws when used outside ThemeProvider', () => {
    expect(() => {
      renderHook(() => useTheme())
    }).toThrow('useTheme must be used within a ThemeProvider')
  })
})

describe('ThemeProvider - accent color', () => {
  it('exposes accent color', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>
    })
    expect(result.current.accentColor).toBe('#0091EB')
  })

  it('exports DEFAULT_ACCENT_COLOR and uses it as the default', () => {
    expect(DEFAULT_ACCENT_COLOR).toBe('#0091EB')
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>
    })
    expect(result.current.accentColor).toBe(DEFAULT_ACCENT_COLOR)
  })

  it('accepts custom default accent color', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => (
        <ThemeProvider defaultAccentColor='#FF6B00'>{children}</ThemeProvider>
      )
    })
    expect(result.current.accentColor).toBe('#FF6B00')
  })

  it('allows changing accent color (uncontrolled)', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>
    })
    act(() => result.current.setAccentColor('#FF0000'))
    expect(result.current.accentColor).toBe('#FF0000')
  })
})

describe('getAccentStyleSync', () => {
  it('returns just the :root CSS body (no style tag wrapper)', () => {
    const css = getAccentStyleSync('#0091EB')
    expect(css).toMatch(/^:root\{/)
    expect(css).toContain('--accent-hue:')
    expect(css).toContain('--accent-chroma:')
    expect(css).not.toContain('<style')
  })

  it('throws InvalidColorError on invalid input', () => {
    expect(() => getAccentStyleSync('garbage')).toThrow(InvalidColorError)
  })
})

describe('getAccentStyleTagSync', () => {
  it('returns a synchronous style tag with --accent-hue and --accent-chroma', () => {
    const tag = getAccentStyleTagSync('#0091EB')
    expect(tag).toMatch(/^<style id="roadie-accent-theme">/)
    expect(tag).toContain('--accent-hue:')
    expect(tag).toContain('--accent-chroma:')
    expect(tag).toMatch(/<\/style>$/)
  })

  it('accepts a custom id', () => {
    const tag = getAccentStyleTagSync('#0091EB', 'custom-id')
    expect(tag).toContain('id="custom-id"')
  })

  it('sanitizes the id to strip angle brackets and quotes', () => {
    const tag = getAccentStyleTagSync('#0091EB', '<script>"')
    expect(tag).toContain('id="script"')
  })

  it('throws InvalidColorError on invalid input', () => {
    expect(() => getAccentStyleTagSync('not-a-hex')).toThrow(InvalidColorError)
  })

  it('produces identical hue/chroma across calls (deterministic)', () => {
    const a = getAccentStyleTagSync('#0091EB')
    const b = getAccentStyleTagSync('#0091EB')
    expect(a).toBe(b)
  })
})

describe('isValidHexColor', () => {
  it('accepts 6-digit hex', () => {
    expect(isValidHexColor('#0091EB')).toBe(true)
    expect(isValidHexColor('#abcdef')).toBe(true)
  })

  it('accepts 3-digit shorthand', () => {
    expect(isValidHexColor('#abc')).toBe(true)
  })

  it('accepts 8-digit hex with alpha', () => {
    expect(isValidHexColor('#0091EBff')).toBe(true)
  })

  it('rejects missing hash', () => {
    expect(isValidHexColor('0091EB')).toBe(false)
  })

  it('rejects non-hex characters', () => {
    expect(isValidHexColor('#xyz123')).toBe(false)
  })

  it('rejects non-strings', () => {
    expect(isValidHexColor(null)).toBe(false)
    expect(isValidHexColor(undefined)).toBe(false)
    expect(isValidHexColor(0x0091eb)).toBe(false)
    expect(isValidHexColor({})).toBe(false)
  })
})

describe('ThemeProvider - setAccentColor validation', () => {
  it('throws InvalidColorError on invalid hex', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>
    })
    expect(() => {
      act(() => result.current.setAccentColor('not-a-hex'))
    }).toThrow(InvalidColorError)
  })

  it('throws synchronously, before the effect runs', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>
    })
    expect(() => result.current.setAccentColor('#nope')).toThrow(
      /Invalid accent colour/
    )
  })

  it('accepts valid hex inputs', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>
    })
    expect(() => {
      act(() => result.current.setAccentColor('#FF0000'))
    }).not.toThrow()
    expect(result.current.accentColor).toBe('#FF0000')
  })
})

describe('ThemeProvider - controlled accentColor prop', () => {
  it('uses the controlled prop instead of internal state', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => (
        <ThemeProvider accentColor='#FF0000'>{children}</ThemeProvider>
      )
    })
    expect(result.current.accentColor).toBe('#FF0000')
  })

  it('re-renders update the accent colour when the prop changes', () => {
    function Reader() {
      const { accentColor } = useTheme()
      return <div data-testid='accent'>{accentColor}</div>
    }
    function Harness({ accentColor }: { accentColor?: string | null }) {
      return (
        <ThemeProvider accentColor={accentColor}>
          <Reader />
        </ThemeProvider>
      )
    }

    const { getByTestId, rerender } = render(<Harness accentColor='#FF0000' />)
    expect(getByTestId('accent').textContent).toBe('#FF0000')

    rerender(<Harness accentColor='#00FF00' />)
    expect(getByTestId('accent').textContent).toBe('#00FF00')
  })

  it('ignores defaultAccentColor when controlled', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => (
        <ThemeProvider accentColor='#FF0000' defaultAccentColor='#00FF00'>
          {children}
        </ThemeProvider>
      )
    })
    expect(result.current.accentColor).toBe('#FF0000')
  })

  it('coerces null to defaultAccentColor', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => (
        <ThemeProvider accentColor={null} defaultAccentColor='#00FF00'>
          {children}
        </ThemeProvider>
      )
    })
    expect(result.current.accentColor).toBe('#00FF00')
  })

  it('coerces null to DEFAULT_ACCENT_COLOR when no defaultAccentColor is given', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => (
        <ThemeProvider accentColor={null}>{children}</ThemeProvider>
      )
    })
    expect(result.current.accentColor).toBe(DEFAULT_ACCENT_COLOR)
  })

  it('falls back to default and warns on invalid controlled input', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => (
        <ThemeProvider accentColor='garbage' defaultAccentColor='#00FF00'>
          {children}
        </ThemeProvider>
      )
    })
    expect(result.current.accentColor).toBe('#00FF00')
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Invalid accentColor')
    )
    warn.mockRestore()
  })

  it('setAccentColor on a controlled provider is a no-op + dev warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => (
        <ThemeProvider accentColor='#FF0000'>{children}</ThemeProvider>
      )
    })
    act(() => result.current.setAccentColor('#00FF00'))
    expect(result.current.accentColor).toBe('#FF0000')
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('controlled <ThemeProvider>')
    )
    warn.mockRestore()
  })

  it('setAccentColor on a controlled provider still validates first', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => (
        <ThemeProvider accentColor='#FF0000'>{children}</ThemeProvider>
      )
    })
    expect(() => {
      act(() => result.current.setAccentColor('not-a-hex'))
    }).toThrow(InvalidColorError)
    warn.mockRestore()
  })

  it('warns when switching between controlled and uncontrolled', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    function Harness({ accentColor }: { accentColor?: string | null }) {
      return (
        <ThemeProvider accentColor={accentColor}>
          <span>child</span>
        </ThemeProvider>
      )
    }
    const { rerender } = render(<Harness accentColor='#FF0000' />)
    rerender(<Harness accentColor={undefined} />)
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('switching from controlled to uncontrolled')
    )
    warn.mockRestore()
  })
})

describe('ThemeProvider - toggle interaction', () => {
  it('setDark toggles correctly in sequence', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>
    })
    expect(result.current.isDark).toBe(false)

    act(() => result.current.setDark(true))
    expect(result.current.isDark).toBe(true)

    act(() => result.current.setDark(false))
    expect(result.current.isDark).toBe(false)

    act(() => result.current.setDark(true))
    expect(result.current.isDark).toBe(true)
  })

  it('uses a toggle button correctly', async () => {
    const user = userEvent.setup()

    function TestToggle() {
      const { isDark, setDark } = useTheme()
      return (
        <button onClick={() => setDark(!isDark)}>
          {isDark ? 'dark' : 'light'}
        </button>
      )
    }

    const { getByText } = render(
      <ThemeProvider>
        <TestToggle />
      </ThemeProvider>
    )

    expect(getByText('light')).toBeInTheDocument()
    await user.click(getByText('light'))
    expect(getByText('dark')).toBeInTheDocument()
    await user.click(getByText('dark'))
    expect(getByText('light')).toBeInTheDocument()
  })
})
