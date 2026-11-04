import { describe, expect, it } from 'vitest'
import { eraseDigit, filledCount, isComplete, placeDigit, targetSlot } from './code'

describe('typing a code slot by slot', () => {
  it('fills left to right when no slot is chosen', () => {
    let cur = ''
    for (const d of '1234') cur = placeDigit(cur, 4, d, null)
    expect(cur).toBe('1234')
    expect(isComplete(cur, 4)).toBe(true)
    expect(placeDigit(cur, 4, '5', null)).toBe('1234')
  })

  it('puts a known digit straight into its slot, then fills the gaps', () => {
    let cur = placeDigit('', 4, '7', 2)
    expect(cur).toBe('__7')
    expect(filledCount(cur)).toBe(1)
    expect(isComplete(cur, 4)).toBe(false)
    expect(targetSlot(cur, 4, null)).toBe(0)
    for (const d of '123') cur = placeDigit(cur, 4, d, null)
    expect(cur).toBe('1273')
  })

  it('replaces the digit in a chosen slot and refuses a repeat elsewhere', () => {
    expect(placeDigit('1234', 4, '9', 1)).toBe('1934')
    expect(placeDigit('1234', 4, '3', 0)).toBe('1234')
    expect(placeDigit('1234', 4, '2', 1)).toBe('1234')
  })

  it('erases the chosen slot, else the last digit, dropping trailing gaps', () => {
    expect(eraseDigit('1234', 1)).toBe('1_34')
    expect(eraseDigit('1234', null)).toBe('123')
    expect(eraseDigit('__7', null)).toBe('')
    expect(eraseDigit('1_3', 1)).toBe('1')
    expect(eraseDigit('', null)).toBe('')
  })
})
