import { shareRow, type Len, type ShareRow } from '@bc/game-core'
import { HEAD_BOX } from '../../components/ui/characters'
import type { ShareLabels } from './shareLabels'
import type { ShareModel } from './shareModel'

/** The picture is square, 1080×1080 (spec A §4). */
export const PNG_SIZE = 1080

/** The parts the template cannot know by itself: the head markup and the embedded fonts. */
export interface SvgParts {
  readonly bull: string
  readonly cow: string
  readonly fontCss: string
}

const CARD = { x: 60, size: 960, r: 60 } as const
const LOGO = { x: 120, y: 120, size: 120, r: 28 } as const
const TITLE = { x: 265, y: 172, size: 54 } as const
const HEADING = { x: 265, y: 218, size: 30 } as const
const BIG = { x: 120, y: 330, size: 80 } as const
const ASIDE = { x: 960, y: 330, size: 46 } as const
const GRID = { x: 120, y: 370, w: 840, maxH: 540, pad: 28, gap: 12, r: 36 } as const
const CELL = { min: 28, max: 96 } as const
const BOTTOM = { y: 985, pillH: 72, pillSize: 40, betterSize: 30 } as const
const PILL_PAD = 26
const PILL_CHAR_W = 0.62
const BULL = '🐂'
const COW = '🐄'
const COLORS = {
  paper: '#F6F2E6',
  card: '#FFFDF6',
  cardLine: '#E7E0CC',
  ink: '#2E3B24',
  muted: '#6B7560',
  dim: '#4A5640',
  accent: '#B5452F',
  green: '#5E9E46',
  inset: '#F3EEDF',
  blank: '#E4DDCB',
  blankLine: '#D6CDB6',
  bull: '#5E9E46',
  bullLine: '#3F7A2E',
  cow: '#F2C230',
  cowLine: '#C9A033',
} as const

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function text(x: number, y: number, size: number, weight: number, fill: string, body: string, extra = ''): string {
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}"${extra}>${body}</text>`
}

function cell(kind: string, x: number, y: number, s: number, parts: SvgParts): string {
  const [fill, line, head] =
    kind === BULL
      ? [COLORS.bull, COLORS.bullLine, parts.bull]
      : kind === COW
        ? [COLORS.cow, COLORS.cowLine, parts.cow]
        : [COLORS.blank, COLORS.blankLine, '']
  const rect = `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${Math.round(s / 4)}" fill="${fill}" stroke="${line}" stroke-width="4"/>`
  if (!head) return rect
  const inset = Math.round(s * 0.18)
  const hs = s - inset * 2
  return `${rect}<svg x="${x + inset}" y="${y + inset}" width="${hs}" height="${hs}" viewBox="${HEAD_BOX}">${head}</svg>`
}

/** Cells shrink so every attempt fits the grid box; `rows` is the number of attempts. */
export function cellSize(rows: number): number {
  const free = GRID.maxH - GRID.pad * 2 - (rows - 1) * GRID.gap
  return Math.max(CELL.min, Math.min(CELL.max, Math.floor(free / Math.max(1, rows))))
}

function grid(rows: readonly ShareRow[], len: Len, parts: SvgParts): string {
  if (rows.length === 0) return ''
  const s = cellSize(rows.length)
  const h = GRID.pad * 2 + rows.length * s + (rows.length - 1) * GRID.gap
  const rowW = len * s + (len - 1) * GRID.gap
  const x0 = GRID.x + (GRID.w - rowW) / 2
  const cells = rows.flatMap((row, i) =>
    Array.from(shareRow(row, len)).map((kind, j) =>
      cell(kind, x0 + j * (s + GRID.gap), GRID.y + GRID.pad + i * (s + GRID.gap), s, parts),
    ),
  )
  return `<rect x="${GRID.x}" y="${GRID.y}" width="${GRID.w}" height="${h}" rx="${GRID.r}" fill="${COLORS.inset}"/>${cells.join('')}`
}

function bottom(labels: ShareLabels): string {
  const better = text(ASIDE.x, BOTTOM.y, BOTTOM.betterSize, 800, COLORS.muted, esc(labels.better), ' text-anchor="end"')
  if (!labels.top) return better
  const w = Math.round(labels.top.length * BOTTOM.pillSize * PILL_CHAR_W + PILL_PAD * 2)
  const y = BOTTOM.y - BOTTOM.pillH / 2 - 10
  const pill =
    `<g transform="rotate(-2 ${BIG.x + w / 2} ${y + BOTTOM.pillH / 2})">` +
    `<rect x="${BIG.x}" y="${y}" width="${w}" height="${BOTTOM.pillH}" rx="24" fill="${COLORS.accent}"/>` +
    text(BIG.x + w / 2, y + BOTTOM.pillH / 2 + BOTTOM.pillSize * 0.36, BOTTOM.pillSize, 900, '#FFFFFF', esc(labels.top), ' text-anchor="middle"') +
    '</g>'
  return pill + better
}

/** The 1080×1080 card as an SVG document: the same layout as `.sh-card` (Р1), scaled up. */
export function shareSvg(labels: ShareLabels, rows: readonly ShareRow[], len: Len, parts: SvgParts): string {
  const logo =
    `<rect x="${LOGO.x}" y="${LOGO.y}" width="${LOGO.size}" height="${LOGO.size}" rx="${LOGO.r}" fill="${COLORS.green}"/>` +
    `<svg x="${LOGO.x + 8}" y="${LOGO.y + 8}" width="${LOGO.size - 16}" height="${LOGO.size - 16}" viewBox="${HEAD_BOX}">${parts.bull}</svg>`
  const title = text(TITLE.x, TITLE.y, TITLE.size, 900, COLORS.ink, `${esc(labels.title)} <tspan fill="${COLORS.accent}">${esc(labels.titleAccent)}</tspan>`)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PNG_SIZE}" height="${PNG_SIZE}" viewBox="0 0 ${PNG_SIZE} ${PNG_SIZE}" font-family="Nunito, system-ui, sans-serif">` +
    `<style>${parts.fontCss}</style>` +
    `<rect width="${PNG_SIZE}" height="${PNG_SIZE}" fill="${COLORS.paper}"/>` +
    `<rect x="${CARD.x}" y="${CARD.x}" width="${CARD.size}" height="${CARD.size}" rx="${CARD.r}" fill="${COLORS.card}" stroke="${COLORS.cardLine}" stroke-width="6"/>` +
    logo +
    title +
    text(HEADING.x, HEADING.y, HEADING.size, 800, COLORS.muted, esc(labels.heading)) +
    text(BIG.x, BIG.y, BIG.size, 900, COLORS.ink, esc(labels.big)) +
    text(ASIDE.x, ASIDE.y, ASIDE.size, 900, COLORS.dim, esc(labels.aside), ' text-anchor="end"') +
    grid(rows, len, parts) +
    bottom(labels) +
    '</svg>'
  )
}

// ── fonts: the self-hosted Nunito faces, embedded as data URLs (an <img> SVG loads no external files) ──

const FONTS = [
  {
    url: '/fonts/Nunito-cyrillic.woff2',
    range: 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116',
  },
  {
    url: '/fonts/Nunito-latin.woff2',
    range:
      'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  },
] as const

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('font read failed'))
    reader.readAsDataURL(blob)
  })
}

async function fontFace(font: (typeof FONTS)[number]): Promise<string> {
  try {
    const res = await fetch(font.url)
    if (!res.ok) return ''
    const data = await toDataUrl(await res.blob())
    return `@font-face{font-family:'Nunito';font-style:normal;font-weight:400 900;src:url(${data}) format('woff2');unicode-range:${font.range}}`
  } catch {
    // Offline or blocked: the picture falls back to the system font.
    return ''
  }
}

let fontCssCache: Promise<string> | null = null

/** The `@font-face` rules once (both files are fetched a single time per page). */
export function fontCss(): Promise<string> {
  fontCssCache ??= Promise.all(FONTS.map(fontFace)).then((faces) => faces.join(''))
  return fontCssCache
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('svg failed to load'))
    img.src = url
  })
}

/**
 * Draws an SVG document on a canvas and exports it as PNG. The SVG travels as a `data:` URL: the
 * production CSP allows `img-src 'self' data:` and no `blob:`.
 */
export async function svgToPng(svg: string, size: number): Promise<Blob> {
  const img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')
  ctx.drawImage(img, 0, 0, size, size)
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('png export failed'))), 'image/png'),
  )
}

/** The share picture: waits for the page fonts, embeds them, renders the SVG template to a PNG blob. */
export async function renderSharePng(model: ShareModel, labels: ShareLabels): Promise<Blob> {
  await document.fonts.ready
  const [{ headMarkup }, css] = await Promise.all([import('./heads'), fontCss()])
  const svg = shareSvg(labels, model.input.rows, model.input.len, { bull: headMarkup('bull'), cow: headMarkup('cow'), fontCss: css })
  return svgToPng(svg, PNG_SIZE)
}
