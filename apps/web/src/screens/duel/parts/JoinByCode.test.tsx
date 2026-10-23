import { fireEvent, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../../../test/render'
import { JoinByCode } from './JoinByCode'

function show() {
  return renderWithI18n(
    <MemoryRouter initialEntries={['/duel/new']}>
      <Routes>
        <Route path="/duel/new" element={<JoinByCode />} />
        <Route path="/d/:code" element={<p>joined</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('JoinByCode', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('offers the camera only where getUserMedia exists', () => {
    const { unmount } = show()
    expect(screen.queryByRole('button', { name: 'Сканирай QR код с камерата' })).toBeNull()
    unmount()
    vi.stubGlobal('navigator', { ...navigator, mediaDevices: { getUserMedia: vi.fn() } })
    show()
    expect(screen.getByRole('button', { name: 'Сканирай QR код с камерата' })).toBeInTheDocument()
  })

  it('goes to the invite page for a typed code, whatever the case', () => {
    show()
    fireEvent.change(screen.getByLabelText('Имаш код от приятел?'), { target: { value: 'abc23' } })
    fireEvent.click(screen.getByRole('button', { name: 'Влез' }))
    expect(screen.getByText('joined')).toBeInTheDocument()
  })

  it('takes the code out of a pasted link', () => {
    show()
    const input = screen.getByLabelText('Имаш код от приятел?')
    fireEvent.paste(input, { clipboardData: { getData: () => 'https://pasishte.test/d/XYZ89' } })
    expect(input).toHaveValue('XYZ89')
  })

  it('explains an incomplete code instead of leaving', () => {
    show()
    fireEvent.change(screen.getByLabelText('Имаш код от приятел?'), { target: { value: 'AB' } })
    fireEvent.click(screen.getByRole('button', { name: 'Влез' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Кодът е 5 знака')
    expect(screen.queryByText('joined')).toBeNull()
  })
})
