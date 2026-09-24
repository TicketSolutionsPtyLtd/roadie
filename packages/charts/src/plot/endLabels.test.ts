import { describe, expect, it } from 'vitest'

import {
  endLabelRoom,
  endLabelsFit,
  labelGap,
  stackLabels,
  textRoom
} from './endLabels'
import { plotFrame } from './frame'

describe('end labels', () => {
  it('pushes colliding labels apart, keeping the top one in place', () => {
    const stacked = stackLabels(
      [
        { text: 'Target 85%', y: 0.85, tone: 'value' },
        { text: 'Forecast 84%', y: 0.84, tone: 'highlight' },
        { text: 'Similar shows', y: 0.83, tone: 'label' }
      ],
      0.06
    )
    expect(stacked.map((l) => l.y)).toEqual(
      [0.85, 0.79, 0.73].map((v) => expect.closeTo(v, 5))
    )
  })

  it('never lets two labels sit closer than the gap', () => {
    const stacked = stackLabels(
      Array.from({ length: 5 }, (_, i) => ({
        text: `S${i}`,
        y: 0.5,
        tone: 'label' as const
      })),
      0.05
    )
    for (let i = 1; i < stacked.length; i++)
      expect(stacked[i - 1]!.y - stacked[i]!.y).toBeGreaterThanOrEqual(
        0.05 - 1e-9
      )
  })

  it('turns a font size into value units for the plot height', () => {
    const frame = plotFrame(220, 'default')
    expect(labelGap(frame, [0, 1])).toBeCloseTo((12 + 3) / (220 - 34), 5)
  })

  it('drops end labels for a legend when they would not fit', () => {
    expect(endLabelsFit(3, plotFrame(220, 'default'))).toBe(true)
    expect(endLabelsFit(5, plotFrame(220, 'default'))).toBe(false)
    expect(endLabelsFit(2, plotFrame(160, 'narrow'))).toBe(false)
  })

  it('reserves room for the longest label', () => {
    const frame = plotFrame(220, 'default')
    const short = endLabelRoom([{ text: 'GA', y: 1, tone: 'label' }], frame)
    const long = endLabelRoom(
      [{ text: 'Forecast 96%', y: 1, tone: 'label' }],
      frame
    )
    expect(long).toBeGreaterThan(short)
  })
})

describe('text room', () => {
  const frame = plotFrame(220, 'default')

  it('measures the longest text at the frame font size plus padding', () => {
    expect(textRoom(['GA', 'Forecast 96%'], frame, 12)).toBe(
      Math.ceil(12 * 12 * 0.62) + 12
    )
  })

  it('reserves only the padding for no text', () => {
    expect(textRoom([], frame, 8)).toBe(8)
  })

  it('backs end label room', () => {
    const labels = [{ text: 'Forecast 96%', y: 1, tone: 'label' as const }]
    expect(endLabelRoom(labels, frame)).toBe(
      textRoom(['Forecast 96%'], frame, 12)
    )
  })
})
