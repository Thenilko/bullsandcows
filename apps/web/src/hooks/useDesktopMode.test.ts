import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { mockViewport, resetViewport } from '../test/viewport'
import { useDesktopMode } from './useDesktopMode'
import { useIsDesktop } from './useIsDesktop'

afterEach(resetViewport)

describe('useDesktopMode', () => {
  it('is split at 819px of height', () => {
    mockViewport(1280, 819)
    expect(renderHook(() => useDesktopMode()).result.current).toBe('split')
  })

  it('is split on a portrait tablet (768 wide), however tall', () => {
    mockViewport(768, 1024)
    expect(renderHook(() => useDesktopMode()).result.current).toBe('split')
  })

  it('is immersive from 820px of height', () => {
    mockViewport(1280, 820)
    expect(renderHook(() => useDesktopMode()).result.current).toBe('immersive')
    mockViewport(1440, 900)
    expect(renderHook(() => useDesktopMode()).result.current).toBe('immersive')
  })

  it('reports split on phones, where useIsDesktop is false anyway', () => {
    mockViewport(390, 900)
    expect(renderHook(() => useDesktopMode()).result.current).toBe('split')
    expect(renderHook(() => useIsDesktop()).result.current).toBe(false)
  })

  it('reports split without matchMedia (server render)', () => {
    expect(renderHook(() => useDesktopMode()).result.current).toBe('split')
  })
})
