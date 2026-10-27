import { screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../../test/renderRoute'
import { renderWithI18n } from '../../test/render'
import { bg } from './content/bg'
import { en } from './content/en'
import { fill, pieces } from './fill'
import { InfoPage } from './InfoPage'
import { SiteFooter } from './SiteFooter'
import { INFO_KEYS } from './types'

/** The shape of a page without its words, so bg and en can be compared. */
function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shape)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, k === 'href' ? v : shape(v)]),
    )
  }
  return typeof value
}

describe('info page content', () => {
  it('has the same pages, sections and links in both languages', () => {
    expect(shape(en)).toEqual(shape(bg))
  })

  it('keeps every text filled in', () => {
    const texts = JSON.stringify([bg, en]).match(/"[^"]*"/g) ?? []
    expect(texts).not.toContain('""')
  })

  it('leaves no unknown placeholder after filling', () => {
    for (const key of INFO_KEYS) expect(fill(JSON.stringify(bg[key]))).not.toMatch(/\{[A-Z]+\}/)
  })
})

describe('pieces', () => {
  it('splits markdown links out of the text', () => {
    expect(pieces('See [the terms](/terms) and [GitHub](https://github.com).')).toEqual([
      { text: 'See ' },
      { text: 'the terms', href: '/terms' },
      { text: ' and ' },
      { text: 'GitHub', href: 'https://github.com' },
      { text: '.' },
    ])
  })
})

describe('SiteFooter', () => {
  it('links every info page, the story and the changelog', () => {
    renderWithI18n(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>,
    )
    for (const [name, href] of [
      ['Поверителност', '/privacy'],
      ['Условия', '/terms'],
      ['Правна информация', '/legal'],
      ['Какво ново', '/changelog'],
      ['За медии', '/press'],
      ['Подкрепа', '/support'],
    ] as const) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href)
    }
    expect(screen.getByRole('link', { name: /историята зад играта/ })).toHaveAttribute(
      'href',
      '/story',
    )
    expect(screen.getByRole('link', { name: /^Версия v/ })).toHaveAttribute('href', '/changelog')
    expect(screen.getByText(/Безплатна игра/)).toBeInTheDocument()
  })
})

describe('InfoPage', () => {
  it.each(INFO_KEYS)('renders the %s page with its title and the footer', (key) => {
    renderRoute(<InfoPage page={key} />, { path: `/${key}`, at: `/${key}` })
    expect(screen.getByRole('heading', { level: 1, name: bg[key].title })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('turns in-app links in the text into router links', () => {
    renderRoute(<InfoPage page="terms" />, { path: '/terms', at: '/terms' })
    const internal = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('href') === '/privacy')
    expect(internal.length).toBeGreaterThan(0)
  })
})
