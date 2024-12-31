import { jest } from '@jest/globals'

// Import the functions we want to test
import {
  processTokenValue,
  transformBaseTokens,
  transformSemanticTokens
} from './build-panda-tokens.js'

// Mock the file system operations
jest.mock('fs')
jest.mock('path')

describe('Token Processing', () => {
  describe('processTokenValue', () => {
    test('processes fontFamily tokens correctly', () => {
      const fontValue = [
        'ui-sans-serif',
        'system-ui',
        '-apple-system',
        'BlinkMacSystemFont'
      ]
      const result = processTokenValue('fontFamily', fontValue)
      expect(result).toBe(
        'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont'
      )
    })

    test('processes shadow tokens correctly', () => {
      const shadowValue = {
        offsetX: '0px',
        offsetY: '4px',
        blurRadius: '6px',
        spreadRadius: '0px',
        color: 'rgba(0, 0, 0, 0.1)'
      }
      const result = processTokenValue('shadow', shadowValue)
      expect(result).toBe('0px 4px 6px 0px rgba(0, 0, 0, 0.1)')
    })

    test('processes multiple shadows correctly', () => {
      const shadowValues = [
        {
          offsetX: '0px',
          offsetY: '4px',
          blurRadius: '6px',
          spreadRadius: '0px',
          color: 'rgba(0, 0, 0, 0.1)'
        },
        {
          offsetX: '0px',
          offsetY: '2px',
          blurRadius: '4px',
          color: 'rgba(0, 0, 0, 0.06)'
        }
      ]
      const result = processTokenValue('shadow', shadowValues)
      expect(result).toBe(
        '0px 4px 6px 0px rgba(0, 0, 0, 0.1), 0px 2px 4px rgba(0, 0, 0, 0.06)'
      )
    })

    test('processes mode-based fontFamily tokens correctly', () => {
      const modeValue = {
        light: ['Arial', 'sans-serif'],
        dark: ['Monaco', 'monospace']
      }
      const result = processTokenValue('fontFamily', null, true, modeValue)
      expect(result).toEqual({
        base: 'Arial, sans-serif',
        _dark: 'Monaco, monospace'
      })
    })

    test('processes mode-based shadow tokens correctly', () => {
      const modeValue = {
        light: [
          {
            offsetX: '0px',
            offsetY: '4px',
            blurRadius: '6px',
            color: 'rgba(0, 0, 0, 0.1)'
          }
        ],
        dark: [
          {
            offsetX: '0px',
            offsetY: '4px',
            blurRadius: '6px',
            color: 'rgba(255, 255, 255, 0.1)'
          }
        ]
      }
      const result = processTokenValue('shadow', null, true, modeValue)
      expect(result).toEqual({
        base: '0px 4px 6px rgba(0, 0, 0, 0.1)',
        _dark: '0px 4px 6px rgba(255, 255, 255, 0.1)'
      })
    })

    test('handles unknown token types with default processor', () => {
      const value = '16px'
      const result = processTokenValue('unknownType', value)
      expect(result).toBe('16px')
    })
  })

  describe('Token Transformations', () => {
    test('transforms base tokens correctly', () => {
      const baseTokens = {
        fonts: {
          $type: 'fontFamily',
          sans: {
            $type: 'fontFamily',
            $value: ['Arial', 'sans-serif'],
            $description: 'Sans-serif font family'
          }
        },
        shadows: {
          $type: 'shadow',
          sm: {
            $type: 'shadow',
            $value: {
              offsetX: '0px',
              offsetY: '1px',
              blurRadius: '2px',
              color: 'rgba(0,0,0,0.05)'
            },
            $description: 'Small shadow'
          }
        }
      }

      const result = transformBaseTokens(baseTokens)
      expect(result).toEqual({
        fonts: {
          sans: {
            value: 'Arial, sans-serif',
            description: 'Sans-serif font family'
          }
        },
        shadows: {
          sm: {
            value: '0px 1px 2px rgba(0,0,0,0.05)',
            description: 'Small shadow'
          }
        }
      })
    })

    test('transforms semantic tokens correctly', () => {
      const semanticTokens = {
        colors: {
          $type: 'color',
          accent: {
            $type: 'color',
            $value: '{colors.blue.9}',
            $description: 'Primary accent color',
            $extensions: {
              mode: {
                light: '{colors.blue.9}',
                dark: '{colors.blue.10}'
              }
            }
          }
        }
      }

      const result = transformSemanticTokens(semanticTokens)
      expect(result).toEqual({
        colors: {
          accent: {
            value: {
              base: 'var(--colors-blue-9)',
              _dark: 'var(--colors-blue-10)'
            },
            description: 'Primary accent color'
          }
        }
      })
    })
  })
})
