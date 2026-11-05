import { fireEvent, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../../test/render'
import { InviteView, type InviteChallenge } from './Invite'

const INVITE = {
  code: 'ABCDE',
  url: 'https://x/d/ABCDE',
  roomId: 'r1',
  token: 't1',
  challengeId: 'c1',
  toUsername: 'Ники',
}
const SETTINGS = { len: 4, zero: false, format: 'race' } as const

function show(challenge: InviteChallenge, handlers = { onCancel: vi.fn(), onBack: vi.fn() }) {
  renderWithI18n(
    <MemoryRouter>
      <InviteView
        invite={INVITE}
        settings={SETTINGS}
        copy="idle"
        expired={false}
        elapsedMs={5000}
        onCopy={vi.fn()}
        onShare={vi.fn()}
        challenge={challenge}
        {...handlers}
      />
    </MemoryRouter>,
  )
  return handlers
}

describe('InviteView for a leaderboard challenge', () => {
  it('waits for the challenged player instead of showing the code', () => {
    const { onCancel } = show({ to: 'Ники', status: 'pending' })
    expect(screen.getByRole('status')).toHaveTextContent('Чакаме Ники да приеме')
    expect(screen.queryByText('ABCDE')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Копирай линка' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Откажи' }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('tells the sender about a refusal and leads back to the board', () => {
    const { onBack } = show({ to: 'Ники', status: 'declined' })
    expect(screen.getByRole('alert')).toHaveTextContent('Ники отказа')
    fireEvent.click(screen.getByRole('button', { name: 'Към класацията' }))
    expect(onBack).toHaveBeenCalled()
  })

  it('says while waiting that the target is playing, or will come after the game', () => {
    show({ to: 'Ники', status: 'pending', note: 'playing' })
    expect(screen.getByRole('status')).toHaveTextContent('Ники играе в момента — ще види поканата')
  })

  it('says the target will come once their game is over', () => {
    show({ to: 'Ники', status: 'pending', note: 'later' })
    expect(screen.getByRole('status')).toHaveTextContent('Ники е в игра — ще дойде след нея')
    expect(screen.getByRole('button', { name: 'Откажи' })).toBeInTheDocument()
  })

  it('says when nobody answered in time', () => {
    show({ to: 'Ники', status: 'expired' })
    expect(screen.getByRole('alert')).toHaveTextContent('Ники не отговори навреме.')
  })
})
