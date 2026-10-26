// Generates the PWA icons in public/icons from the bull in the pasture scene.
// Usage: pnpm --filter web icons   (output is committed; sharp is a dev-only dependency)
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const BG = '#F6F2E6'
const root = (p) => fileURLToPath(new URL(p, import.meta.url))

const source = readFileSync(root('../src/components/scene/Bull.tsx'), 'utf8')
const match = source.match(/return \(\s*(<g className="bull">[\s\S]*<\/g>)\s*\)\s*\}/)
if (!match) throw new Error('Bull markup not found in Bull.tsx')

const bull = match[1]
  .replace(/<ellipse cx="42" cy="53"[^>]*\/>/, '')
  .replaceAll('className=', 'class=')
  .replaceAll('strokeWidth', 'stroke-width')
  .replaceAll('strokeLinecap', 'stroke-linecap')

const defs = `<defs>
<linearGradient id="psBullBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6E4E3C"/><stop offset=".5" stop-color="#3D2B21"/><stop offset="1" stop-color="#20160F"/></linearGradient>
<linearGradient id="psBullHead" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6A4B3B"/><stop offset="1" stop-color="#2B1E17"/></linearGradient>
<linearGradient id="psBullLeg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B2A20"/><stop offset="1" stop-color="#1C130E"/></linearGradient>
<linearGradient id="psHorn" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#D3BD92"/><stop offset="1" stop-color="#FFF8E6"/></linearGradient>
</defs>`

// The bull spans roughly x 1..76, y 2..53 in its own coordinate space.
const BULL_W = 76
const BULL_CX = 38.5
const BULL_CY = 28

/** `fill` is the bull's share of the canvas width; `disc` draws a round badge instead of a full-bleed square. */
function svg(size, fill, disc) {
  const k = (size * fill) / BULL_W
  const tx = size / 2 - BULL_CX * k
  const ty = size / 2 - BULL_CY * k
  const bg = disc
    ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${BG}"/>`
    : `<rect width="${size}" height="${size}" fill="${BG}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${defs}${bg}<g transform="translate(${tx} ${ty}) scale(${k})">${bull}</g></svg>`
}

const outputs = [
  ['icon-192.png', 192, 0.74, true],
  ['icon-512.png', 512, 0.74, true],
  ['icon-maskable-512.png', 512, 0.56, false],
  ['apple-touch-icon.png', 180, 0.62, false],
]

mkdirSync(root('../public/icons'), { recursive: true })
for (const [name, size, fill, disc] of outputs) {
  await sharp(Buffer.from(svg(size, fill, disc))).png().toFile(root(`../public/icons/${name}`))
}
