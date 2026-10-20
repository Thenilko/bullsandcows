import { renderHook, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCountdownRun } from './useCountdownRun'

beforeEach(() => void vi.useFakeTimers())
afterEach(() => void vi.useRealTimers())

describe('useCountdownRun', () => {
  it('stays off without a start instant', () => {
    expect(renderHook(() => useCountdownRun(null)).result.current).toBe(false)
  })

  it('turns on 2100 ms before the start instant', () => {
    const startAt = Date.now() + 3100
    const { result } = renderHook(() => useCountdownRun(startAt))
    act(() => void vi.advanceTimersByTime(999))
    expect(result.current).toBe(false)
    act(() => void vi.advanceTimersByTime(1))
    expect(result.current).toBe(true)
  })
})
