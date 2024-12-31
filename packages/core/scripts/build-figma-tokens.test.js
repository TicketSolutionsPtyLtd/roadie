import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it, vi } from 'vitest'

import { processSemanticTokens } from './build-figma-tokens'

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

describe('Figma Token Processing', () => {
  describe('processSemanticTokens', () => {
    it('processes semantic tokens for light mode', () => {
      const tokens = {
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

      expect(processSemanticTokens(tokens, 'light')).toEqual({
        colors: {
          $type: 'color',
          accent: {
            $type: 'color',
            $value: '{colors.blue.1}',
            $description: 'Accent color'
          }
        }
      })
    })

    it('processes semantic tokens for dark mode', () => {
      const tokens = {
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

      expect(processSemanticTokens(tokens, 'dark')).toEqual({
        colors: {
          $type: 'color',
          accent: {
            $type: 'color',
            $value: '{colors.blue.2}',
            $description: 'Accent color'
          }
        }
      })
    })

    it('handles tokens without mode', () => {
      const tokens = {
        colors: {
          $type: 'color',
          accent: {
            $type: 'color',
            $value: '{colors.blue.1}',
            $description: 'Accent color'
          }
        }
      }

      expect(processSemanticTokens(tokens, 'light')).toEqual({
        colors: {
          $type: 'color',
          accent: {
            $type: 'color',
            $value: '{colors.blue.1}',
            $description: 'Accent color'
          }
        }
      })
    })

    it('handles nested token groups', () => {
      const tokens = {
        colors: {
          $type: 'color',
          accent: {
            $type: 'color',
            primary: {
              $type: 'color',
              $value: '{colors.blue.1}',
              $description: 'Primary accent',
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

      expect(processSemanticTokens(tokens, 'light')).toEqual({
        colors: {
          $type: 'color',
          accent: {
            $type: 'color',
            primary: {
              $type: 'color',
              $value: '{colors.blue.1}',
              $description: 'Primary accent'
            }
          }
        }
      })
    })

    it('skips non-object token groups', () => {
      const tokens = {
        string: 'skip me',
        number: 42,
        colors: {
          $type: 'color',
          accent: {
            $type: 'color',
            $value: '{colors.blue.1}'
          }
        }
      }

      expect(processSemanticTokens(tokens, 'light')).toEqual({
        colors: {
          $type: 'color',
          accent: {
            $type: 'color',
            $value: '{colors.blue.1}'
          }
        }
      })
    })

    it('skips token groups without $type', () => {
      const tokens = {
        invalid: {
          accent: {
            $value: '{colors.blue.1}'
          }
        },
        colors: {
          $type: 'color',
          accent: {
            $type: 'color',
            $value: '{colors.blue.1}'
          }
        }
      }

      expect(processSemanticTokens(tokens, 'light')).toEqual({
        colors: {
          $type: 'color',
          accent: {
            $type: 'color',
            $value: '{colors.blue.1}'
          }
        }
      })
    })

    it('skips $ prefixed keys', () => {
      const tokens = {
        colors: {
          $type: 'color',
          $description: 'Skip me',
          accent: {
            $type: 'color',
            $value: '{colors.blue.1}'
          }
        }
      }

      expect(processSemanticTokens(tokens, 'light')).toEqual({
        colors: {
          $type: 'color',
          accent: {
            $type: 'color',
            $value: '{colors.blue.1}'
          }
        }
      })
    })

    it('uses light mode by default', () => {
      const tokens = {
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
      }

      expect(processSemanticTokens(tokens)).toEqual({
        colors: {
          $type: 'color',
          accent: {
            $type: 'color',
            $value: '{colors.blue.1}'
          }
        }
      })
    })
  })

  describe('main module execution', () => {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const figmaDir = path.join(__dirname, '../src/tokens/figma')

    beforeEach(() => {
      vi.clearAllMocks()
      // Setup default mock implementations
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.endsWith('tokens.json')) {
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
        if (filePath.endsWith('semantic-tokens.json')) {
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
        throw new Error(`Unexpected file path: ${filePath}`)
      })
    })

    it('creates figma directory if it does not exist', async () => {
      fs.existsSync.mockReturnValue(false)

      // Import the module to trigger the main execution
      await import('./build-figma-tokens?test1')

      expect(fs.existsSync).toHaveBeenCalledWith(figmaDir)
      expect(fs.mkdirSync).toHaveBeenCalledWith(figmaDir, { recursive: true })
      expect(fs.writeFileSync).toHaveBeenCalledTimes(3) // tokens.json, mode-tokens-light.json, mode-tokens-dark.json
    })

    it('skips directory creation if it already exists', async () => {
      fs.existsSync.mockReturnValue(true)

      // Import the module to trigger the main execution
      await import('./build-figma-tokens?test2')

      expect(fs.existsSync).toHaveBeenCalledWith(figmaDir)
      expect(fs.mkdirSync).not.toHaveBeenCalled()
      expect(fs.writeFileSync).toHaveBeenCalledTimes(3) // tokens.json, mode-tokens-light.json, mode-tokens-dark.json
    })
  })
})
