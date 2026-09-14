'use client'

import { CheckIcon, MoonIcon, SunIcon } from '@phosphor-icons/react'

import {
  Button,
  DEFAULT_ACCENT_COLOR,
  useTheme
} from '@oztix/roadie-components'

const ACCENT_PRESETS = [
  { label: 'Blue (default)', hex: DEFAULT_ACCENT_COLOR },
  { label: 'Purple', hex: '#7C3AED' },
  { label: 'Green', hex: '#72BF44' },
  { label: 'Orange', hex: '#EA580C' },
  { label: 'Pink', hex: '#E83068' }
]

function ThemeToggle() {
  const { isDark, setDark } = useTheme()

  return (
    <Button
      size='sm'
      onClick={() => setDark(!isDark)}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <SunIcon weight='bold' className='size-4' />
      ) : (
        <MoonIcon weight='bold' className='size-4' />
      )}
      <span>{isDark ? 'Light' : 'Dark'} mode</span>
    </Button>
  )
}

function AccentPicker() {
  const { accentColor, setAccentColor } = useTheme()

  return (
    <div className='grid gap-2'>
      <p className='text-sm font-semibold text-strong'>Accent color</p>
      <div className='flex flex-wrap gap-2'>
        {ACCENT_PRESETS.map((preset) => {
          const isActive =
            accentColor.toLowerCase() === preset.hex.toLowerCase()
          return (
            <button
              key={preset.hex}
              onClick={() => setAccentColor(preset.hex)}
              className='grid size-9 place-items-center rounded-full ring-0 ring-neutral-5 transition-transform hover:scale-110 hover:shadow-lg hover:ring-2'
              style={{ backgroundColor: preset.hex }}
              aria-label={preset.label}
            >
              {isActive && (
                <CheckIcon weight='bold' className='size-4 text-neutral-0' />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function AppearanceSettings() {
  return (
    <div className='grid gap-6'>
      <div className='grid gap-2'>
        <p className='text-sm font-semibold text-strong'>Theme</p>
        <div>
          <ThemeToggle />
        </div>
      </div>
      <AccentPicker />
    </div>
  )
}
