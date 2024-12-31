import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it, vi } from 'vitest'

import {
  processSemanticTokenGroup,
  processTokenGroup,
  processTokenValue,
  shadowObjectToCss,
  transformBaseTokens,
  transformSemanticTokens
} from './build-panda-tokens'

// Mock fs module
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs')
  return {
    default: {
      ...actual.default,
      existsSync: vi.fn(),
      mkdirSync: vi.fn(),
      readFileSync: vi.fn((filePath) => {
        if (filePath.includes('tokens.json')) {
          return JSON.stringify({
            colors: {
              $type: 'color',
              blue: {
                $type: 'color',
                1: {
                  $type: 'color',
                  $value: '#EDF2FF'
                }
              }
            }
          })
        }
        if (filePath.includes('semantic-tokens.json')) {
          return JSON.stringify({
            colors: {
              $type: 'color',
              accent: {
                $type: 'color',
                $value: '{colors.blue.1}',
                $extensions: {
                  mode: {
                    light: '{colors.blue.1}',
                    dark: '{colors.blue.2}'
                  }
                }
              }
            }
          })
        }
        return '{}'
      }),
      writeFileSync: vi.fn()
    }
  }
})

describe('Token Processing', () => {
  describe('shadowObjectToCss', () => {
    it('converts shadow object to CSS string', () => {
      const shadow = {
        offsetX: '0px',
        offsetY: '4px',
        blurRadius: '6px',
        spreadRadius: '0px',
        color: 'rgba(0, 0, 0, 0.1)'
      }
      expect(shadowObjectToCss(shadow)).toBe(
        '0px 4px 6px 0px rgba(0, 0, 0, 0.1)'
      )
    })

    it('handles inset shadows', () => {
      const shadow = {
        inset: true,
        offsetX: '0px',
        offsetY: '4px',
        blurRadius: '6px',
        color: 'rgba(0, 0, 0, 0.1)'
      }
      expect(shadowObjectToCss(shadow)).toBe(
        'inset 0px 4px 6px rgba(0, 0, 0, 0.1)'
      )
    })

    it('handles shadow without spreadRadius', () => {
      const shadow = {
        offsetX: '0px',
        offsetY: '4px',
        blurRadius: '6px',
        color: 'rgba(0, 0, 0, 0.1)'
      }
      expect(shadowObjectToCss(shadow)).toBe('0px 4px 6px rgba(0, 0, 0, 0.1)')
    })
  })

  describe('processTokenValue', () => {
    // Basic value processing
    it('processes fontFamily tokens', () => {
      const value = ['Arial', 'sans-serif']
      expect(processTokenValue('fontFamily', value)).toBe('Arial, sans-serif')
    })

    it('processes single string fontFamily token', () => {
      expect(processTokenValue('fontFamily', 'Arial')).toBe('Arial')
    })

    it('processes shadow tokens', () => {
      const value = {
        offsetX: '0px',
        offsetY: '4px',
        blurRadius: '6px',
        color: 'rgba(0, 0, 0, 0.1)'
      }
      expect(processTokenValue('shadow', value)).toBe(
        '0px 4px 6px rgba(0, 0, 0, 0.1)'
      )
    })

    it('processes breakpoint value directly', () => {
      expect(processTokenValue('breakpoint', '480px')).toBe('480px')
    })

    it('processes default value directly', () => {
      expect(processTokenValue('customType', '42rem')).toBe('42rem')
    })

    // Array-based values
    it('processes array of shadow tokens', () => {
      const value = [
        {
          offsetX: '0px',
          offsetY: '4px',
          blurRadius: '6px',
          color: 'rgba(0, 0, 0, 0.1)'
        },
        {
          offsetX: '0px',
          offsetY: '2px',
          blurRadius: '4px',
          color: 'rgba(0, 0, 0, 0.05)'
        }
      ]
      expect(processTokenValue('shadow', value)).toBe(
        '0px 4px 6px rgba(0, 0, 0, 0.1), 0px 2px 4px rgba(0, 0, 0, 0.05)'
      )
    })

    // Mode-based values
    describe('mode-based values', () => {
      it('processes mode-based font families', () => {
        const modeValue = {
          light: ['Arial', 'sans-serif'],
          dark: ['Monaco', 'monospace']
        }
        expect(processTokenValue('fontFamily', null, true, modeValue)).toEqual({
          base: 'Arial, sans-serif',
          _dark: 'Monaco, monospace'
        })
      })

      it('processes mode-based shadow tokens', () => {
        const modeValue = {
          light: {
            offsetX: '0px',
            offsetY: '4px',
            blurRadius: '6px',
            color: 'rgba(0, 0, 0, 0.1)'
          },
          dark: {
            offsetX: '0px',
            offsetY: '4px',
            blurRadius: '6px',
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
        expect(processTokenValue('shadow', null, true, modeValue)).toEqual({
          base: '0px 4px 6px rgba(0, 0, 0, 0.1)',
          _dark: '0px 4px 6px rgba(255, 255, 255, 0.1)'
        })
      })

      it('processes mode-based array of shadow tokens', () => {
        const modeValue = {
          light: [
            {
              offsetX: '0px',
              offsetY: '4px',
              blurRadius: '6px',
              color: 'rgba(0, 0, 0, 0.1)'
            },
            {
              offsetX: '0px',
              offsetY: '2px',
              blurRadius: '4px',
              color: 'rgba(0, 0, 0, 0.05)'
            }
          ],
          dark: [
            {
              offsetX: '0px',
              offsetY: '4px',
              blurRadius: '6px',
              color: 'rgba(255, 255, 255, 0.1)'
            },
            {
              offsetX: '0px',
              offsetY: '2px',
              blurRadius: '4px',
              color: 'rgba(255, 255, 255, 0.05)'
            }
          ]
        }
        expect(processTokenValue('shadow', null, true, modeValue)).toEqual({
          base: '0px 4px 6px rgba(0, 0, 0, 0.1), 0px 2px 4px rgba(0, 0, 0, 0.05)',
          _dark:
            '0px 4px 6px rgba(255, 255, 255, 0.1), 0px 2px 4px rgba(255, 255, 255, 0.05)'
        })
      })

      it('processes mode-based array of font families', () => {
        const modeValue = {
          light: ['Arial', 'Helvetica', 'sans-serif'],
          dark: ['Monaco', 'Consolas', 'monospace']
        }
        expect(processTokenValue('fontFamily', null, true, modeValue)).toEqual({
          base: 'Arial, Helvetica, sans-serif',
          _dark: 'Monaco, Consolas, monospace'
        })
      })

      it('processes mode-based font families with single string values', () => {
        const modeValue = {
          light: 'Arial',
          dark: 'Monaco'
        }
        expect(processTokenValue('fontFamily', null, true, modeValue)).toEqual({
          base: 'Arial',
          _dark: 'Monaco'
        })
      })

      it('processes mode-based breakpoint tokens', () => {
        const modeValue = {
          light: '480px',
          dark: '600px'
        }
        expect(processTokenValue('breakpoint', null, true, modeValue)).toEqual({
          base: '480px',
          _dark: '600px'
        })
      })

      it('processes mode-based breakpoint array tokens', () => {
        const modeValue = {
          light: ['480px', '768px'],
          dark: ['600px', '900px']
        }
        expect(processTokenValue('breakpoint', null, true, modeValue)).toEqual({
          base: ['480px', '768px'],
          _dark: ['600px', '900px']
        })
      })

      it('processes mode-based default tokens', () => {
        const modeValue = {
          light: '42rem',
          dark: '36rem'
        }
        expect(processTokenValue('customType', null, true, modeValue)).toEqual({
          base: '42rem',
          _dark: '36rem'
        })
      })

      it('processes mode-based default array tokens', () => {
        const modeValue = {
          light: ['42rem', '48rem'],
          dark: ['36rem', '40rem']
        }
        expect(processTokenValue('customType', null, true, modeValue)).toEqual({
          base: ['42rem', '48rem'],
          _dark: ['36rem', '40rem']
        })
      })
    })

    // Edge cases
    describe('edge cases', () => {
      it('uses default processor for unknown types', () => {
        expect(processTokenValue('unknown', '16px')).toBe('16px')
      })

      it('handles empty arrays', () => {
        expect(processTokenValue('fontFamily', [])).toBe('')
      })

      it('handles mode-based empty arrays', () => {
        const modeValue = {
          light: [],
          dark: []
        }
        expect(processTokenValue('fontFamily', null, true, modeValue)).toEqual({
          base: '',
          _dark: ''
        })
      })
    })
  })

  describe('processTokenGroup', () => {
    it('processes nested token groups', () => {
      const group = {
        fonts: {
          $type: 'fontFamily',
          sans: {
            $type: 'fontFamily',
            $value: ['Arial', 'sans-serif'],
            $description: 'Sans-serif font'
          }
        }
      }
      const result = {}
      processTokenGroup(group, result)
      expect(result).toEqual({
        fonts: {
          sans: {
            value: 'Arial, sans-serif',
            description: 'Sans-serif font'
          }
        }
      })
    })

    it('handles breakpoint tokens differently', () => {
      const group = {
        breakpoints: {
          $type: 'breakpoint',
          sm: {
            $type: 'breakpoint',
            $value: '480px'
          }
        }
      }
      const result = {}
      processTokenGroup(group, result)
      expect(result).toEqual({
        breakpoints: {
          sm: '480px'
        }
      })
    })

    it('skips $ prefixed keys', () => {
      const group = {
        $type: 'color',
        $description: 'Skip me',
        color: {
          $type: 'color',
          $value: '#000'
        }
      }
      const result = {}
      processTokenGroup(group, result)
      expect(result).toEqual({
        color: {
          value: '#000'
        }
      })
    })

    it('handles non-object values', () => {
      const group = {
        string: 'skip me',
        number: 42,
        valid: {
          $type: 'color',
          $value: '#000'
        }
      }
      const result = {}
      processTokenGroup(group, result)
      expect(result).toEqual({
        valid: {
          value: '#000'
        }
      })
    })
  })

  describe('processSemanticTokenGroup', () => {
    it('processes semantic token groups', () => {
      const group = {
        colors: {
          $type: 'color',
          accent: {
            $type: 'color',
            $value: '{colors.blue.1}',
            $description: 'Accent color',
            $extensions: {
              mode: {
                light: '{colors.blue.1}',
                dark: '{colors.blue.2}'
              }
            }
          }
        }
      }
      const result = {}
      processSemanticTokenGroup(group, result)
      expect(result).toEqual({
        colors: {
          accent: {
            value: {
              base: '{colors.blue.1}',
              _dark: '{colors.blue.2}'
            },
            description: 'Accent color'
          }
        }
      })
    })

    it('skips $ prefixed keys', () => {
      const group = {
        $type: 'color',
        $description: 'Skip me',
        color: {
          $type: 'color',
          $value: '#000'
        }
      }
      const result = {}
      processSemanticTokenGroup(group, result)
      expect(result).toEqual({
        color: {
          value: '#000'
        }
      })
    })

    it('skips non-object values', () => {
      const group = {
        string: 'skip me',
        number: 42,
        valid: {
          $type: 'color',
          $value: '#000'
        }
      }
      const result = {}
      processSemanticTokenGroup(group, result)
      expect(result).toEqual({
        valid: {
          value: '#000'
        }
      })
    })

    it('handles default key', () => {
      const group = {
        colors: {
          default: {
            $type: 'color',
            $value: '#000'
          }
        }
      }
      const result = {}
      processSemanticTokenGroup(group, result)
      expect(result).toEqual({
        colors: {
          DEFAULT: {
            value: '#000'
          }
        }
      })
    })
  })

  describe('transformBaseTokens', () => {
    it('transforms base tokens', () => {
      const tokens = {
        colors: {
          $type: 'color',
          blue: {
            $type: 'color',
            1: {
              $type: 'color',
              $value: '#EDF2FF',
              $description: 'Light blue'
            }
          }
        }
      }
      expect(transformBaseTokens(tokens)).toEqual({
        colors: {
          blue: {
            1: {
              value: '#EDF2FF',
              description: 'Light blue'
            }
          }
        }
      })
    })

    it('skips non-object token groups', () => {
      const tokens = {
        string: 'skip me',
        number: 42,
        validGroup: {
          $type: 'color',
          token: {
            $type: 'color',
            $value: '#000'
          }
        }
      }
      expect(transformBaseTokens(tokens)).toEqual({
        validGroup: {
          token: {
            value: '#000'
          }
        }
      })
    })

    it('skips token groups without $type', () => {
      const tokens = {
        invalid: {
          token: {
            $value: '#000'
          }
        },
        valid: {
          $type: 'color',
          token: {
            $type: 'color',
            $value: '#000'
          }
        }
      }
      expect(transformBaseTokens(tokens)).toEqual({
        valid: {
          token: {
            value: '#000'
          }
        }
      })
    })
  })

  describe('transformSemanticTokens', () => {
    it('transforms semantic tokens', () => {
      const tokens = {
        colors: {
          $type: 'color',
          accent: {
            $type: 'color',
            1: {
              $type: 'color',
              $value: '{colors.blue.1}',
              $description: 'Accent color',
              $extensions: {
                mode: {
                  light: '{colors.blue.1}',
                  dark: '{colors.blue.2}'
                }
              }
            }
          }
        }
      }
      expect(transformSemanticTokens(tokens)).toEqual({
        colors: {
          accent: {
            1: {
              value: {
                base: '{colors.blue.1}',
                _dark: '{colors.blue.2}'
              },
              description: 'Accent color'
            }
          }
        }
      })
    })

    it('skips non-object token groups', () => {
      const tokens = {
        string: 'skip me',
        number: 42,
        validGroup: {
          $type: 'color',
          token: {
            $type: 'color',
            $value: '#000'
          }
        }
      }
      expect(transformSemanticTokens(tokens)).toEqual({
        validGroup: {
          token: {
            value: '#000'
          }
        }
      })
    })

    it('skips token groups without $type', () => {
      const tokens = {
        invalid: {
          token: {
            $value: '#000'
          }
        },
        valid: {
          $type: 'color',
          token: {
            $type: 'color',
            $value: '#000'
          }
        }
      }
      expect(transformSemanticTokens(tokens)).toEqual({
        valid: {
          token: {
            value: '#000'
          }
        }
      })
    })
  })

  describe('main module execution', () => {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const outputDir = path.join(__dirname, '../src/tokens/panda')

    beforeEach(() => {
      vi.clearAllMocks()
      // Setup default mock implementations
      fs.readFileSync.mockImplementation((path) => {
        if (path.endsWith('tokens.json')) {
          return JSON.stringify({
            colors: {
              $type: 'color',
              blue: {
                $type: 'color',
                1: {
                  $type: 'color',
                  $value: '#EDF2FF'
                }
              }
            }
          })
        }
        if (path.endsWith('semantic-tokens.json')) {
          return JSON.stringify({
            colors: {
              $type: 'color',
              accent: {
                $type: 'color',
                $value: '{colors.blue.1}',
                $extensions: {
                  mode: {
                    light: '{colors.blue.1}',
                    dark: '{colors.blue.2}'
                  }
                }
              }
            }
          })
        }
        return '{}'
      })
    })

    it('creates output directory if it does not exist', async () => {
      fs.existsSync.mockReturnValue(false)

      // Import the module to trigger the main execution
      await import('./build-panda-tokens?test1')

      expect(fs.existsSync).toHaveBeenCalledWith(outputDir)
      expect(fs.mkdirSync).toHaveBeenCalledWith(outputDir, { recursive: true })
    })

    it('skips directory creation if it already exists', async () => {
      fs.existsSync.mockReturnValue(true)

      // Import the module to trigger the main execution
      await import('./build-panda-tokens?test2')

      expect(fs.existsSync).toHaveBeenCalledWith(outputDir)
      expect(fs.mkdirSync).not.toHaveBeenCalled()
    })
  })
})
