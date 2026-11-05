import type { AdminBotConfigDto, BotConfigDto } from '@bc/protocol'
import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderRoute } from '../../test/renderRoute'

const get = vi.fn()
const put = vi.fn()
const del = vi.fn()
vi.mock('../../features/auth/client', () => ({
  api: {
    get: (p: string) => get(p),
    put: (p: string, body: unknown) => put(p, body),
    del: (p: string) => del(p),
  },
}))

const { AdminBot } = await import('./AdminBot')

const defaults: BotConfigDto = {
  raceThinkMs: [35000, 25000, 18000, 12000],
  lostHint: [0.8, 0.6, 0.45],
  proSample: 6,
}
const custom: BotConfigDto = {
  raceThinkMs: [30000, 25000, 18000, 9500],
  lostHint: [0.8, 0.5, 0.45],
  proSample: 10,
}
const view = (config: BotConfigDto): AdminBotConfigDto => ({
  config,
  defaults,
  isDefault: config === defaults,
})

const show = () => renderRoute(<AdminBot enabled />, { path: '/admin', at: '/admin' })
const field = (name: string) => screen.getByRole('spinbutton', { name }) as HTMLInputElement
const type = (name: string, value: string) => fireEvent.change(field(name), { target: { value } })
const save = () => screen.getByRole('button', { name: 'Запази' })

beforeEach(() => {
  get.mockReset()
  put.mockReset()
  del.mockReset()
  get.mockResolvedValue(view(defaults))
})

describe('AdminBot', () => {
  it('shows the current values in seconds and percent, with the defaults beside them', async () => {
    get.mockResolvedValue(view(custom))
    show()
    expect(await screen.findByText(/Сега са твоите стойности/)).toBeInTheDocument()
    expect(field('Лесно: Мисли на ход в надпревара (сек)').value).toBe('30')
    expect(field('Експерт: Мисли на ход в надпревара (сек)').value).toBe('9.5')
    expect(field('Средно: Изпуска подсказка (%)').value).toBe('50')
    expect(field('Трудно: Изпуска подсказка (%)').value).toBe('45')
    expect(screen.queryByRole('spinbutton', { name: 'Експерт: Изпуска подсказка (%)' })).toBeNull()
    expect(field('Колко кандидата претегля експертът').value).toBe('10')
    expect(screen.getByText('по подразбиране: 35')).toBeInTheDocument()
    expect(screen.getByText('по подразбиране: 60')).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('/api/admin/bot')
  })

  it('saves the edited values in ms and as a chance', async () => {
    put.mockImplementation(async (_p: string, body: BotConfigDto) => view(body))
    show()
    await screen.findByText(/Сега са стойностите по подразбиране/)
    type('Лесно: Мисли на ход в надпревара (сек)', '40')
    type('Трудно: Изпуска подсказка (%)', '30')
    type('Колко кандидата претегля експертът', '12')
    fireEvent.click(save())
    await vi.waitFor(() =>
      expect(put).toHaveBeenCalledWith('/api/admin/bot', {
        raceThinkMs: [40000, 25000, 18000, 12000],
        lostHint: [0.8, 0.6, 0.3],
        proSample: 12,
      }),
    )
    expect(await screen.findByText(/^Запазено/)).toBeInTheDocument()
  })

  it('will not save a value out of bounds', async () => {
    show()
    await screen.findByText(/Сега са стойностите по подразбиране/)
    type('Средно: Изпуска подсказка (%)', '120')
    expect(screen.getByRole('alert')).toHaveTextContent('Има стойност извън границите.')
    expect(save()).toBeDisabled()
    type('Средно: Изпуска подсказка (%)', '')
    expect(save()).toBeDisabled()
    type('Средно: Изпуска подсказка (%)', '60')
    expect(save()).toBeEnabled()
    type('Експерт: Мисли на ход в надпревара (сек)', '0.5')
    expect(save()).toBeDisabled()
    expect(put).not.toHaveBeenCalled()
  })

  it('goes back to the defaults and shows them in the form', async () => {
    get.mockResolvedValue(view(custom))
    del.mockResolvedValue(view(defaults))
    show()
    await screen.findByText(/Сега са твоите стойности/)
    fireEvent.click(screen.getByRole('button', { name: 'Върни по подразбиране' }))
    await vi.waitFor(() => expect(del).toHaveBeenCalledWith('/api/admin/bot'))
    expect(await screen.findByText('Върнато по подразбиране.')).toBeInTheDocument()
    expect(field('Лесно: Мисли на ход в надпревара (сек)').value).toBe('35')
    expect(field('Колко кандидата претегля експертът').value).toBe('6')
    expect(screen.getByText(/Сега са стойностите по подразбиране/)).toBeInTheDocument()
  })

  it('says so when saving fails', async () => {
    put.mockRejectedValue(new Error('down'))
    show()
    await screen.findByText(/Сега са стойностите по подразбиране/)
    fireEvent.click(save())
    expect(await screen.findByRole('alert')).toHaveTextContent('Не се запази. Опитай пак.')
  })
})
