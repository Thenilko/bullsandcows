import { describe, expect, it } from 'vitest'
import type { ShareLabels } from './shareLabels'
import { headMarkup } from './heads'
import { cellSize, PNG_SIZE, shareSvg } from './sharePng'

const LABELS: ShareLabels = {
  title: 'Бикове',
  titleAccent: 'и крави',
  heading: 'Число на деня #127 · 22 окт',
  big: '5 опита',
  aside: '01:36',
  top: 'ТОП 20% днес',
  better: 'Можеш ли по-добре?',
}
const PARTS = { bull: headMarkup('bull'), cow: headMarkup('cow'), fontCss: '@font-face{font-family:Nunito}' }
const ROWS = [
  { bulls: 0, cows: 1 },
  { bulls: 1, cows: 1 },
  { bulls: 2, cows: 1 },
  { bulls: 3, cows: 0 },
  { bulls: 4, cows: 0 },
]

const parse = (svg: string) => new DOMParser().parseFromString(svg, 'image/svg+xml')

describe('shareSvg', () => {
  it('is a 1080×1080 document with the fonts, the title and the labels', () => {
    const doc = parse(shareSvg(LABELS, ROWS, 4, PARTS))
    const root = doc.documentElement
    expect(root.tagName).toBe('svg')
    expect(root.getAttribute('width')).toBe(String(PNG_SIZE))
    expect(root.getAttribute('viewBox')).toBe('0 0 1080 1080')
    expect(doc.querySelector('style')?.textContent).toBe(PARTS.fontCss)
    const texts = Array.from(doc.querySelectorAll('text')).map((e) => e.textContent)
    expect(texts).toContain('Бикове и крави')
    expect(texts).toContain(LABELS.heading)
    expect(texts).toContain(LABELS.big)
    expect(texts).toContain(LABELS.aside)
    expect(texts).toContain(LABELS.top)
    expect(texts).toContain(LABELS.better)
  })

  it('draws one cell per digit per attempt, with a bull or cow head where the verdict says so', () => {
    const doc = parse(shareSvg(LABELS, ROWS, 4, PARTS))
    const bulls = doc.querySelectorAll('[data-head="bull"]').length
    const cows = doc.querySelectorAll('[data-head="cow"]').length
    // 10 bulls + 3 cows in the rows, plus the bull of the logo.
    expect(bulls).toBe(11)
    expect(cows).toBe(3)
    const cells = Array.from(doc.querySelectorAll('rect')).filter((r) => r.getAttribute('width') === r.getAttribute('height') && Number(r.getAttribute('width')) <= 96 && Number(r.getAttribute('width')) >= 28)
    expect(cells).toHaveLength(ROWS.length * 4)
  })

  it('leaves out the top pill when there is none and escapes the opponent name', () => {
    const labels = { ...LABELS, top: null, heading: 'Дуел с <Боби & Ко>' }
    const svg = shareSvg(labels, [], 4, PARTS)
    const doc = parse(svg)
    expect(doc.querySelector('parsererror')).toBeNull()
    expect(Array.from(doc.querySelectorAll('text')).map((e) => e.textContent)).toContain('Дуел с <Боби & Ко>')
    expect(svg).not.toContain('ТОП')
  })
})

describe('cellSize', () => {
  it('keeps 96px up to five rows and shrinks after, never below 28', () => {
    expect(cellSize(1)).toBe(96)
    expect(cellSize(5)).toBe(87)
    expect(cellSize(12)).toBe(29)
    expect(cellSize(30)).toBe(28)
  })
})
