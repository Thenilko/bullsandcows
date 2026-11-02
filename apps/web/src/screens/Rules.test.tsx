import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../test/renderRoute'
import { Rules } from './Rules'

describe('Rules', () => {
  it('explains why the game is good for kids', () => {
    renderRoute(<Rules />, { path: '/rules', at: '/rules' })
    expect(screen.getByText('Защо е полезна за децата')).toBeInTheDocument()
    expect(screen.getByText(/Тук не печели този, който налучква/)).toBeInTheDocument()
  })
})
