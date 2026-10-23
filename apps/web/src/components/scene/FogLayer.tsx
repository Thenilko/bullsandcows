import type { CSSProperties } from 'react'

/** Artboard units of the mobile scene (PastureScene's viewBox). */
const ART_W = 390
const ART_H = 380
/** Drift of the design's `ps-fog` keyframes, in artboard px. */
const DRIFT = 26

const BLOBS = [
  { cx: 90, cy: 210, rx: 130, ry: 55, dur: '14s', delay: undefined },
  { cx: 290, cy: 290, rx: 140, ry: 60, dur: '18s', delay: '-6s' },
  { cx: 160, cy: 340, rx: 120, ry: 45, dur: '16s', delay: '-3s' },
] as const

/**
 * The design blurred the blobs with feGaussianBlur(12). A filter over moving shapes is re-rasterized on the CPU
 * every frame (in WebKit it was ~90% of the scene's cost on a phone), so the softness comes from a radial
 * gradient instead; the radii grow by the blur's reach so the fog covers the same ground.
 */
export const FOG_SPREAD = 18

const pct = (n: number, of: number) => `${Math.round((n / of) * 10000) / 100}%`

/** Position and drift of one blob as percentages of the artboard box, so the layer scales with the svg. */
function blobStyle(b: (typeof BLOBS)[number], reduced: boolean): CSSProperties {
  const rx = b.rx + FOG_SPREAD
  const ry = b.ry + FOG_SPREAD
  const style: Record<string, string> = {
    left: pct(b.cx - rx, ART_W),
    top: pct(b.cy - ry, ART_H),
    width: pct(2 * rx, ART_W),
    height: pct(2 * ry, ART_H),
  }
  if (!reduced) {
    style['--fog-shift'] = pct(DRIFT, 2 * rx)
    style.animationDuration = b.dur
    if (b.delay) style.animationDelay = b.delay
  }
  return style as CSSProperties
}

/**
 * The fog lives outside the svg, as plain elements over it: a CSS transform animation of an element inside an
 * svg repaints the whole drawing every frame (WebKit, and Chromium for most of these), while the same
 * animation on an HTML element runs on the compositor. The box is the svg's box (`.art`), so artboard
 * coordinates map to percentages.
 */
export function FogLayer({ fog, reduced }: { fog: number; reduced: boolean }) {
  return (
    <div data-layer="fog" className="ps-fogl ps-fade" style={{ opacity: fog }}>
      {BLOBS.map((b) => (
        <span key={b.cx} className={reduced ? 'ps-fogs' : 'ps-fogb'} style={blobStyle(b, reduced)} />
      ))}
    </div>
  )
}
