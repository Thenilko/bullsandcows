import { screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSession } from '../features/auth/session'
import { renderWithI18n } from '../test/render'
import { RequireAuth, RETURN_TO_KEY } from './RequireAuth'

function show(path: string) {
  return renderWithI18n(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>login page</p>} />
        <Route element={<RequireAuth />}>
          <Route path="/secret" element={<p>secret page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  useSession.getState().clear()
  sessionStorage.clear()
})

describe('RequireAuth', () => {
  it('redirects to /login and stores returnTo when unauthenticated', () => {
    show('/secret')
    expect(screen.getByText('login page')).toBeInTheDocument()
    expect(sessionStorage.getItem(RETURN_TO_KEY)).toBe('/secret')
  })

  it('renders the child route with a session', () => {
    useSession.setState({
      session: { accessToken: 't', refreshToken: 'r', expiresAt: 1, user: { id: 'u', isGuest: true } },
    })
    show('/secret')
    expect(screen.getByText('secret page')).toBeInTheDocument()
  })
})
