import { act, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../../test/render'
import { Countdown } from './Countdown'

describe('Countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows 3, 2, 1 and calls onDone at 2100ms', () => {
    const onDone = vi.fn()
    const onTick = vi.fn()
    renderWithI18n(<Countdown running onDone={onDone} onTick={onTick} />)
    expect(screen.getByText('3')).toBeInTheDocument()
    act(() => void vi.advanceTimersByTime(700))
    expect(screen.getByText('2')).toBeInTheDocument()
    act(() => void vi.advanceTimersByTime(700))
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(onDone).not.toHaveBeenCalled()
    act(() => void vi.advanceTimersByTime(700))
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(onTick.mock.calls.map((c) => c[0])).toEqual([3, 2, 1])
  })

  it('does nothing when not running', () => {
    const onDone = vi.fn()
    const onTick = vi.fn()
    const { container } = renderWithI18n(<Countdown running={false} onDone={onDone} onTick={onTick} />)
    act(() => void vi.advanceTimersByTime(5000))
    expect(container).toBeEmptyDOMElement()
    expect(onDone).not.toHaveBeenCalled()
    expect(onTick).not.toHaveBeenCalled()
  })

  it('cleans up timers on unmount', () => {
    const onDone = vi.fn()
    const { unmount } = renderWithI18n(<Countdown running onDone={onDone} />)
    unmount()
    act(() => void vi.advanceTimersByTime(5000))
    expect(onDone).not.toHaveBeenCalled()
  })
})
