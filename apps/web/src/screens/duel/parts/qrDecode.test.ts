import { afterEach, describe, expect, it, vi } from 'vitest'
import { canScanQr, makeQrDecoder } from './qrDecode'

vi.mock('jsqr', () => ({ default: vi.fn(() => ({ data: 'https://pasishte.test/d/FROMJ' })) }))

const g = globalThis as { BarcodeDetector?: unknown }

afterEach(() => {
  delete g.BarcodeDetector
  vi.unstubAllGlobals()
})

describe('canScanQr', () => {
  it('needs getUserMedia', () => {
    vi.stubGlobal('navigator', { mediaDevices: {} })
    expect(canScanQr()).toBe(false)
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: () => Promise.resolve() } })
    expect(canScanQr()).toBe(true)
  })
})

describe('makeQrDecoder', () => {
  it('prefers the platform BarcodeDetector', async () => {
    g.BarcodeDetector = class {
      detect = vi.fn(async () => [{ rawValue: 'https://pasishte.test/d/NATIV' }])
    }
    const decoder = await makeQrDecoder()
    expect(await decoder.decode(document.createElement('canvas'))).toBe('https://pasishte.test/d/NATIV')
  })

  it('falls back to jsQR on the canvas pixels', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 2
    const ctx = { getImageData: () => ({ data: new Uint8ClampedArray(16), width: 2, height: 2 }) }
    vi.spyOn(canvas, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D)
    const decoder = await makeQrDecoder()
    expect(await decoder.decode(canvas)).toBe('https://pasishte.test/d/FROMJ')
  })
})
