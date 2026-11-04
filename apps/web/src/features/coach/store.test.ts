import { beforeEach, describe, expect, it } from 'vitest'
import { COACH_KEY, dueTip, useCoach } from './store'

describe('coach tips', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useCoach.setState({ seen: new Set() })
  })

  it('shows the notebook tip once the game starts, then the board tip after the first guess', () => {
    const none = new Set<never>()
    expect(dueTip(none, false, 0)).toBeNull()
    expect(dueTip(none, true, 0)).toBe('notes')
    expect(dueTip(new Set(['notes'] as const), true, 0)).toBeNull()
    expect(dueTip(new Set(['notes'] as const), true, 1)).toBe('board')
    expect(dueTip(new Set(['notes', 'board'] as const), true, 3)).toBeNull()
  })

  it('remembers a dismissed tip on the device', () => {
    useCoach.getState().dismiss('notes')
    expect(useCoach.getState().seen.has('notes')).toBe(true)
    expect(JSON.parse(window.localStorage.getItem(COACH_KEY) ?? '[]')).toEqual(['notes'])
  })
})
