import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useKeyboard, type KeyboardHandlers } from './useKeyboard'

function Probe(props: KeyboardHandlers) {
  useKeyboard(props)
  return <input aria-label="field" />
}

function setup(over: Partial<KeyboardHandlers> = {}) {
  const h = { enabled: true, started: true, onDigit: vi.fn(), onBack: vi.fn(), onEnter: vi.fn(), onStart: vi.fn(), ...over }
  const view = render(<Probe {...h} />)
  return { h, view }
}

describe('useKeyboard', () => {
  it('routes digits, Backspace and Enter once started', () => {
    const { h } = setup()
    fireEvent.keyDown(window, { key: '7' })
    fireEvent.keyDown(window, { key: 'Backspace' })
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(h.onDigit).toHaveBeenCalledWith('7')
    expect(h.onBack).toHaveBeenCalledTimes(1)
    expect(h.onEnter).toHaveBeenCalledTimes(1)
    expect(h.onStart).not.toHaveBeenCalled()
  })

  it('uses Enter and Space only to start before the game starts', () => {
    const { h } = setup({ started: false })
    fireEvent.keyDown(window, { key: '5' })
    fireEvent.keyDown(window, { key: 'Enter' })
    fireEvent.keyDown(window, { key: ' ' })
    expect(h.onDigit).not.toHaveBeenCalled()
    expect(h.onStart).toHaveBeenCalledTimes(2)
  })

  it('does nothing when disabled', () => {
    const { h } = setup({ enabled: false })
    fireEvent.keyDown(window, { key: '1' })
    expect(h.onDigit).not.toHaveBeenCalled()
  })

  it('ignores keys typed into an input', () => {
    const { h, view } = setup()
    fireEvent.keyDown(view.getByLabelText('field'), { key: '1' })
    expect(h.onDigit).not.toHaveBeenCalled()
  })
})
