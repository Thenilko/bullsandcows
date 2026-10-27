import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { farmCreatedFixture, farmFixture, farmOwnerFixture } from '../dev/farmFixtures'
import { useSession } from '../features/auth/session'
import { ApiError } from '../lib/api'
import { renderRoute } from '../test/renderRoute'
import { IMMERSIVE, mockViewport, resetViewport } from '../test/viewport'

const get = vi.fn()
const post = vi.fn()
const patch = vi.fn()
const del = vi.fn()
vi.mock('../features/auth/client', () => ({
  api: {
    get: (p: string) => get(p),
    post: (p: string, b?: unknown) => post(p, b),
    patch: (p: string, b: unknown) => patch(p, b),
    del: (p: string) => del(p),
  },
}))

const { Farm } = await import('./Farm')
const { FarmSettings } = await import('./FarmSettings')

const signIn = (isGuest = false) =>
  useSession.setState({ session: { accessToken: 't', refreshToken: '', expiresAt: 0, user: { id: 'mira', isGuest } }, me: null })

const routeGet = (farm: unknown) =>
  get.mockImplementation(async (p: string) => {
    if (p === '/api/farms/me') return { farm }
    if (p === '/api/me/pasture') throw new ApiError('ERR_NOT_FOUND', 404)
    throw new Error(`unexpected ${p}`)
  })

beforeEach(() => {
  for (const m of [get, post, patch, del]) m.mockReset()
  signIn()
})

afterEach(() => resetViewport())

describe('Farm (Р4)', () => {
  it('lists today’s number: who played first, „Напомни“ for the others, the week’s podium', async () => {
    routeGet(farmFixture)
    renderRoute(<Farm />, { path: '/farm', at: '/farm' })
    expect(await screen.findByRole('heading', { name: 'Фермата на Петрови' })).toBeInTheDocument()
    expect(screen.getByText('5 / 12')).toBeInTheDocument()
    expect(screen.getByText('3 от 5 играха')).toBeInTheDocument()
    const today = screen.getByRole('list', { name: 'Днешното число на деня във фермата' })
    const rows = within(today).getAllByRole('listitem')
    expect(rows.map((r) => r.getAttribute('data-member'))).toEqual(['tati', 'mira', 'mama', 'bobi', 'ani'])
    expect(rows[0]).toHaveTextContent('4 оп.')
    expect(rows[0]).toHaveTextContent('01:12')
    expect(rows[1]).toHaveTextContent('Мира (ти)')
    expect(within(rows[3]!).getByRole('button', { name: 'Напомни на Боби' })).toBeEnabled()
    expect(within(rows[4]!).getByRole('button', { name: 'Подсетен' })).toBeDisabled()
    expect(screen.getByText('2140 т.')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Семейна ферма' })).toHaveAttribute('aria-checked', 'true')
  })

  it('nudges a member once and marks them', async () => {
    routeGet(farmFixture)
    post.mockResolvedValue({ done: true })
    renderRoute(<Farm />, { path: '/farm', at: '/farm' })
    fireEvent.click(await screen.findByRole('button', { name: 'Напомни на Боби' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/farms/me/nudge', { userId: 'bobi' }))
    const row = (await screen.findAllByRole('listitem')).find((r) => r.getAttribute('data-member') === 'bobi')!
    await waitFor(() => expect(within(row).getByRole('button', { name: 'Подсетен' })).toBeDisabled())
  })

  it('invites a guest to make a profile instead of showing a farm', () => {
    signIn(true)
    renderRoute(<Farm />, { path: '/farm', at: '/farm' })
    expect(screen.getByRole('button', { name: 'Направи си профил' })).toBeInTheDocument()
    expect(get).not.toHaveBeenCalledWith('/api/farms/me')
  })
})

describe('Farm without a farm (Р5)', () => {
  it('creates a farm and shows „Фермата е готова!“ with the code and the invitation (П3)', async () => {
    routeGet(null)
    post.mockResolvedValue({ farm: farmCreatedFixture, newBadges: [] })
    renderRoute(<Farm />, { path: '/farm', at: '/farm' })
    fireEvent.change(await screen.findByLabelText('Име на фермата'), { target: { value: 'Фермата на Петрови' } })
    fireEvent.click(screen.getByRole('button', { name: 'Създай и вземи код' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/farms', { name: 'Фермата на Петрови' }))
    expect(await screen.findByRole('heading', { name: 'Фермата е готова!' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Код за покана: K 7 Q 2 M' })).toBeInTheDocument()
    expect(screen.getByTestId('farm-invite')).toHaveTextContent('/ferma/K7Q2M')
  })

  it('asks for a name before creating', async () => {
    routeGet(null)
    renderRoute(<Farm />, { path: '/farm', at: '/farm' })
    fireEvent.click(await screen.findByRole('button', { name: 'Създай и вземи код' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Дай име на фермата.')
    expect(post).not.toHaveBeenCalled()
  })

  it('joins with the code from /ferma/:code, Cyrillic look-alikes typed in too', async () => {
    routeGet(null)
    post.mockResolvedValue({ farm: farmFixture, newBadges: [] })
    renderRoute(<Farm />, { path: '/ferma/:code', at: '/ferma/k7q2m' })
    const field = await screen.findByLabelText('Код от 5 знака')
    expect(field).toHaveValue('K7Q2M')
    fireEvent.change(field, { target: { value: 'К7Q2М' } })
    fireEvent.click(screen.getByRole('button', { name: 'Влез във фермата' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/farms/join', { code: 'K7Q2M' }))
  })

  it('explains a wrong or a full farm', async () => {
    routeGet(null)
    post.mockRejectedValue(new ApiError('ERR_FARM_FULL', 409))
    renderRoute(<Farm />, { path: '/farm', at: '/farm' })
    const field = await screen.findByLabelText('Код от 5 знака')
    fireEvent.change(field, { target: { value: 'AB' } })
    fireEvent.click(screen.getByRole('button', { name: 'Влез във фермата' }))
    expect(screen.getByRole('alert')).toHaveTextContent('5 знака')
    fireEvent.change(field, { target: { value: 'ABCDE' } })
    fireEvent.click(screen.getByRole('button', { name: 'Влез във фермата' }))
    expect(await screen.findByText(/Фермата е пълна/)).toBeInTheDocument()
  })

  it('shows „Фермата е готова!“ as a modal over the farm on desktop (ПД6)', async () => {
    mockViewport(...IMMERSIVE)
    routeGet(null)
    post.mockResolvedValue({ farm: farmCreatedFixture, newBadges: [] })
    renderRoute(<Farm />, { path: '/farm', at: '/farm' })
    fireEvent.change(await screen.findByLabelText('Име на фермата'), { target: { value: 'Ферма' } })
    fireEvent.click(screen.getByRole('button', { name: 'Създай и вземи код' }))
    const dialog = await screen.findByRole('dialog', { name: 'Фермата е готова!' })
    expect(within(dialog).getByRole('button', { name: 'Изпрати поканата…' })).toBeInTheDocument()
    expect(document.querySelector('.dk.sc-farm')).not.toBeNull()
  })
})

describe('FarmSettings (П5)', () => {
  it('lets the owner rename, renew the code and remove a member', async () => {
    routeGet(farmOwnerFixture)
    patch.mockResolvedValue({ ...farmOwnerFixture, name: 'Нова ферма' })
    post.mockResolvedValue({ ...farmOwnerFixture, code: 'ZZZZZ' })
    del.mockResolvedValue({ ...farmOwnerFixture, members: farmOwnerFixture.members.filter((m) => m.userId !== 'bobi') })
    renderRoute(<FarmSettings />, { path: '/farm/settings', at: '/farm/settings' })
    const name = await screen.findByLabelText('Име на фермата')
    fireEvent.change(name, { target: { value: 'Нова ферма' } })
    fireEvent.click(screen.getByRole('button', { name: 'Запази' }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/api/farms/me', { name: 'Нова ферма' }))
    fireEvent.click(screen.getByRole('button', { name: 'Нов код' }))
    await waitFor(() => expect(screen.getByTestId('farm-code')).toHaveTextContent('ZZZZZ'))
    fireEvent.click(screen.getByRole('button', { name: 'Премахни Боби от фермата' }))
    await waitFor(() => expect(del).toHaveBeenCalledWith('/api/farms/me/members/bobi'))
    expect(screen.queryByRole('button', { name: /Премахни Мира/ })).toBeNull()
  })

  it('gives a member no owner controls, only leaving (after a confirmation)', async () => {
    routeGet(farmFixture)
    post.mockResolvedValue({ done: true })
    renderRoute(<FarmSettings />, { path: '/farm/settings', at: '/farm/settings' })
    expect(await screen.findByLabelText('Име на фермата')).toHaveAttribute('readonly')
    expect(screen.queryByRole('button', { name: 'Нов код' })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Премахни/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Напусни фермата' }))
    expect(post).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Да, напусни фермата' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/farms/me/leave', undefined))
    expect(await screen.findByText('elsewhere')).toBeInTheDocument()
  })
})
