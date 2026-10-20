import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const play = vi.fn()
vi.mock('../../lib/sound', () => ({ sfx: { play } }))

const { useNotebook, useNotebookStore } = await import('./store')

function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, v),
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
  useNotebookStore.setState({ games: {} })
  play.mockClear()
})

describe('useNotebook', () => {
  it('cycles a digit 0 -> 1 -> 2 -> 0 and plays the page sound', () => {
    const { result } = renderHook(() => useNotebook('g1'))
    const marks: (number | undefined)[] = []
    for (let i = 0; i < 3; i++) {
      act(() => result.current.cycle('7'))
      marks.push(result.current.marks['7'] ?? 0)
    }
    expect(marks).toEqual([1, 2, 0])
    expect(play).toHaveBeenCalledTimes(3)
    expect(play).toHaveBeenCalledWith('page')
  })

  it('survives a remount through localStorage and stays per game', () => {
    const first = renderHook(() => useNotebook('g1'))
    act(() => first.result.current.cycle('7'))
    act(() => first.result.current.setText('seven is in the middle'))
    first.unmount()
    useNotebookStore.setState({ games: {} })

    const again = renderHook(() => useNotebook('g1'))
    expect(again.result.current.marks['7']).toBe(1)
    expect(again.result.current.text).toBe('seven is in the middle')
    expect(localStorage.getItem('bc.notebook.g1')).not.toBeNull()

    const other = renderHook(() => useNotebook('g2'))
    expect(other.result.current.marks).toEqual({})
    expect(other.result.current.text).toBe('')
  })

  it('clearMarks resets the digits but keeps the text', () => {
    const { result } = renderHook(() => useNotebook('g1'))
    act(() => result.current.cycle('3'))
    act(() => result.current.setText('keep me'))
    act(() => result.current.clearMarks())
    expect(result.current.marks).toEqual({})
    expect(result.current.text).toBe('keep me')
  })

  it('ignores corrupt stored data and a failing storage', () => {
    localStorage.setItem('bc.notebook.g1', '{nope')
    const { result } = renderHook(() => useNotebook('g1'))
    expect(result.current.marks).toEqual({})
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    act(() => result.current.cycle('1'))
    expect(result.current.marks['1']).toBe(1)
  })
})
