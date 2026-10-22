import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IMMERSIVE, mockViewport, resetViewport } from '../../test/viewport'
import { Sheet } from './Sheet'

afterEach(() => {
  resetViewport()
})

describe('Sheet', () => {
  it('is a bottom sheet on phones: dialog with the grip, focused on mount', () => {
    render(<Sheet label="Проба" onClose={() => undefined} testId="s"><button type="button">едно</button></Sheet>)
    const dialog = screen.getByRole('dialog', { name: 'Проба' })
    expect(dialog).toHaveClass('sheetup')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveFocus()
    expect(dialog.querySelectorAll('span')).toHaveLength(1)
  })

  it('is a centred modal on desktop, above the result modal', () => {
    mockViewport(...IMMERSIVE)
    render(<Sheet label="Проба" onClose={() => undefined} width={400}><p>x</p></Sheet>)
    const dialog = screen.getByRole('dialog', { name: 'Проба' })
    expect(dialog).toHaveClass('rise')
    expect(dialog.style.width).toContain('400px')
    expect(Number(dialog.style.zIndex)).toBeGreaterThan(21)
  })

  it('closes on the backdrop and Escape, keeps Tab inside and returns the focus to the opener', () => {
    const onClose = vi.fn()
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    const { unmount } = render(
      <Sheet label="Проба" onClose={onClose} testId="s">
        <button type="button">първи</button>
        <button type="button">последен</button>
      </Sheet>,
    )
    fireEvent.click(screen.getByTestId('s-backdrop'))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
    const last = screen.getByRole('button', { name: 'последен' })
    last.focus()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab' })
    expect(screen.getByRole('button', { name: 'първи' })).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab', shiftKey: true })
    expect(last).toHaveFocus()
    unmount()
    expect(opener).toHaveFocus()
    opener.remove()
  })
})

