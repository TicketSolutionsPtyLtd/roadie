import '@testing-library/jest-dom/vitest'
import { render, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  type RoadieLinkComponent,
  RoadieLinkProvider,
  useRoadieLink
} from './RoadieLinkProvider'

const StubLink: RoadieLinkComponent = ({ href, children, ...rest }) => (
  <a data-testid='stub-link' href={href} {...rest}>
    {children}
  </a>
)

const OtherLink: RoadieLinkComponent = ({ href, children, ...rest }) => (
  <a data-testid='other-link' href={href} {...rest}>
    {children}
  </a>
)

describe('RoadieLinkProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('useRoadieLink returns the configured Link inside provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RoadieLinkProvider Link={StubLink}>{children}</RoadieLinkProvider>
    )
    const { result } = renderHook(() => useRoadieLink(), { wrapper })
    expect(result.current).toBe(StubLink)
  })

  it('useRoadieLink returns null outside any provider', () => {
    const { result } = renderHook(() => useRoadieLink())
    expect(result.current).toBeNull()
  })

  it('useRoadieLink returns null when Link is explicitly null', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RoadieLinkProvider Link={null}>{children}</RoadieLinkProvider>
    )
    const { result } = renderHook(() => useRoadieLink(), { wrapper })
    expect(result.current).toBeNull()
  })

  it('keeps context value stable across re-renders with the same Link', () => {
    const seen: Array<RoadieLinkComponent | null> = []
    function Probe() {
      seen.push(useRoadieLink())
      return null
    }
    const { rerender } = render(
      <RoadieLinkProvider Link={StubLink}>
        <Probe />
      </RoadieLinkProvider>
    )
    rerender(
      <RoadieLinkProvider Link={StubLink}>
        <Probe />
      </RoadieLinkProvider>
    )
    expect(seen).toHaveLength(2)
    expect(seen[0]).toBe(StubLink)
    expect(seen[1]).toBe(StubLink)
  })

  it('warns in dev when Link reference changes between renders', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { rerender } = render(
      <RoadieLinkProvider Link={StubLink}>
        <span />
      </RoadieLinkProvider>
    )
    expect(warn).not.toHaveBeenCalled()
    rerender(
      <RoadieLinkProvider Link={OtherLink}>
        <span />
      </RoadieLinkProvider>
    )
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toMatch(/new Link reference/i)
  })

  it('does not warn when Link transitions to or from null', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { rerender } = render(
      <RoadieLinkProvider Link={null}>
        <span />
      </RoadieLinkProvider>
    )
    rerender(
      <RoadieLinkProvider Link={StubLink}>
        <span />
      </RoadieLinkProvider>
    )
    rerender(
      <RoadieLinkProvider Link={null}>
        <span />
      </RoadieLinkProvider>
    )
    expect(warn).not.toHaveBeenCalled()
  })
})
