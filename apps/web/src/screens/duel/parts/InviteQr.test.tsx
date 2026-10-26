import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../../../test/render'
import { InviteQr } from './InviteQr'

vi.mock('qrcode', () => ({
  toDataURL: vi.fn(async (text: string) => `data:image/png;base64,${btoa(text)}`),
}))

describe('InviteQr', () => {
  it('draws the invite link as an image with an accessible name', async () => {
    renderWithI18n(<InviteQr url="https://pasishte.test/d/ABC23" />)
    const img = await waitFor(() => screen.getByRole('img', { name: 'QR код с линка за дуела' }))
    expect(img).toHaveAttribute('src', `data:image/png;base64,${btoa('https://pasishte.test/d/ABC23')}`)
  })
})
