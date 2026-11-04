import { beforeEach, describe, expect, it } from 'vitest'
import { INITIAL_UI, useSolo } from './store'

const rules4 = { len: 4 as const, zero: false }
const ui = (id: string) => useSolo.getState().ui[id] ?? INITIAL_UI

beforeEach(() => {
  useSolo.setState({ ui: {} })
})

describe('solo store', () => {
  it('ignores 0 when zero is disabled', () => {
    useSolo.getState().press('g1', '0', rules4)
    expect(ui('g1').cur).toBe('')
  })

  it('accepts 0 when zero is enabled', () => {
    useSolo.getState().press('g1', '0', { len: 4, zero: true })
    expect(ui('g1').cur).toBe('0')
  })

  it('ignores a fifth digit for len 4', () => {
    for (const d of '12345') useSolo.getState().press('g1', d, rules4)
    expect(ui('g1').cur).toBe('1234')
  })

  it('ignores a repeated digit', () => {
    for (const d of '1121') useSolo.getState().press('g1', d, rules4)
    expect(ui('g1').cur).toBe('12')
  })

  it('back removes the last digit and clears the error', () => {
    for (const d of '123') useSolo.getState().press('g1', d, rules4)
    useSolo.getState().fail('g1', 'LEN')
    useSolo.getState().back('g1')
    expect(ui('g1').cur).toBe('12')
    expect(ui('g1').err).toBeNull()
  })

  it('fail sets the error and bumps shake', () => {
    useSolo.getState().fail('g1', 'REPEAT')
    useSolo.getState().fail('g1', 'LEN')
    expect(ui('g1').err).toBe('LEN')
    expect(ui('g1').shake).toBe(2)
  })

  it('keeps state per game id', () => {
    useSolo.getState().press('g1', '1', rules4)
    useSolo.getState().press('g2', '2', rules4)
    expect(ui('g1').cur).toBe('1')
    expect(ui('g2').cur).toBe('2')
  })

  it('verdict clears the input, flips parity and flags a miss', () => {
    useSolo.getState().press('g1', '1', rules4)
    useSolo.getState().verdict('g1', { bulls: 0, cows: 0 })
    expect(ui('g1')).toMatchObject({ cur: '', parity: !INITIAL_UI.parity, miss: true, lastVerdict: { bulls: 0, cows: 0 } })
  })

  it('clear empties the input only', () => {
    useSolo.getState().press('g1', '1', rules4)
    useSolo.getState().clear('g1')
    expect(ui('g1').cur).toBe('')
  })

  it('does not mutate the previous state object', () => {
    const before = useSolo.getState().ui
    useSolo.getState().press('g1', '1', rules4)
    expect(before).toEqual({})
  })
})

describe('typing into a chosen slot', () => {
  it('places a digit in the tapped slot, then fills the rest in order', () => {
    const rules = { len: 4 as const, zero: false }
    const s = useSolo.getState()
    s.reset('slots')
    s.select('slots', 2)
    s.press('slots', '7', rules)
    expect(useSolo.getState().ui.slots).toMatchObject({ cur: '__7', sel: null })
    for (const d of '123') useSolo.getState().press('slots', d, rules)
    expect(useSolo.getState().ui.slots?.cur).toBe('1273')
    useSolo.getState().select('slots', 1)
    useSolo.getState().back('slots')
    expect(useSolo.getState().ui.slots?.cur).toBe('1_73')
  })
})

