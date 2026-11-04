import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../../test/render'
import { useCoach } from '../coach/store'
import { NotesButton } from './NotesButton'

beforeEach(() => {
  window.localStorage.clear()
  useCoach.setState({ seen: new Set() })
})

describe('NotesButton tip', () => {
  it('points at the notebook until it is opened or dismissed', async () => {
    const onClick = vi.fn()
    renderWithI18n(<NotesButton gameId="g1" onClick={onClick} tip />)
    expect(await screen.findByRole('note')).toHaveTextContent('Това е тефтерчето')
    fireEvent.click(screen.getByRole('button', { name: 'Тефтерче' }))
    expect(onClick).toHaveBeenCalled()
    expect(useCoach.getState().seen.has('notes')).toBe(true)
  })

  it('shows nothing without the tip', () => {
    renderWithI18n(<NotesButton gameId="g1" onClick={vi.fn()} />)
    expect(screen.queryByRole('note')).toBeNull()
  })
})
