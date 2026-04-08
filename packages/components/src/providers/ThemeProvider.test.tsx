import '@testing-library/jest-dom/vitest'
import { act, render, renderHook } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ThemeProvider, useTheme } from './ThemeProvider'

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

  it('accepts custom default accent color', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => (
        <ThemeProvider defaultAccentColor='#FF6B00'>{children}</ThemeProvider>
      )
    })
    expect(result.current.accentColor).toBe('#FF6B00')
  })

  it('allows changing accent color', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>
    })
    act(() => result.current.setAccentColor('#FF0000'))
    expect(result.current.accentColor).toBe('#FF0000')
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
