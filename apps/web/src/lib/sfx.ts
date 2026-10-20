export type SfxName =
  | 'tap' | 'page' | 'chirp' | 'hooves' | 'bull' | 'cow' | 'bell'
  | 'miss' | 'err' | 'win' | 'lose' | 'pop' | 'found'

export interface Sfx {
  play(name: SfxName, delay?: number): void
  setMuted(m: boolean): void
  isMuted(): boolean
}

type Wave = OscillatorType

interface WebkitWindow extends Window {
  webkitAudioContext?: typeof AudioContext
}

function defaultFactory(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || (window as WebkitWindow).webkitAudioContext
  return Ctor ? new Ctor() : null
}

type ToneFn = (f: number, dur: number, type: Wave, vol: number, to: number | null, delay: number) => void
type SoundFn = (tone: ToneFn, d: number) => void

const SOUNDS: Readonly<Record<SfxName, SoundFn>> = {
  tap: (tone, d) => tone(520, 0.06, 'triangle', 0.08, 380, d),
  page: (tone, d) => tone(900, 0.08, 'sine', 0.05, 1400, d),
  chirp: (tone, d) => {
    ;[0, 0.12, 0.24, 0.6, 0.7].forEach((x, i) => tone(2600 + (i % 2) * 500, 0.07, 'sine', 0.05, 3600, d + x))
  },
  hooves: (tone, d) => {
    for (let i = 0; i < 7; i++) tone(90 + (i % 2) * 20, 0.06, 'triangle', 0.18, 60, d + i * 0.09)
  },
  bull: (tone, d) => {
    tone(140, 0.55, 'sawtooth', 0.08, 85, d)
    tone(280, 0.55, 'sine', 0.06, 170, d)
  },
  cow: (tone, d) => {
    tone(250, 0.65, 'triangle', 0.13, 185, d)
    tone(500, 0.5, 'sine', 0.04, 370, d)
  },
  bell: (tone, d) => {
    tone(1320, 0.5, 'sine', 0.05, null, d)
    tone(1980, 0.35, 'sine', 0.025, null, d + 0.02)
  },
  miss: (tone, d) => tone(200, 0.3, 'sawtooth', 0.03, 60, d),
  pop: (tone, d) => tone(700, 0.08, 'sine', 0.08, 1100, d),
  err: (tone, d) => {
    tone(140, 0.18, 'square', 0.07, 110, d)
    tone(133, 0.18, 'square', 0.07, 100, d)
  },
  found: (tone, d) => {
    ;[523, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.12, null, d + i * 0.09))
  },
  win: (tone, d) => {
    ;[392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, null, d + i * 0.1))
    tone(1047, 0.9, 'sine', 0.08, null, d + 0.5)
  },
  lose: (tone, d) => {
    ;[330, 294, 262, 196].forEach((f, i) => tone(f, 0.3, 'triangle', 0.1, null, d + i * 0.18))
  },
}

export function createSfx(ctxFactory: () => AudioContext | null = defaultFactory): Sfx {
  let muted = false
  let ctx: AudioContext | null = null

  function ac(): AudioContext | null {
    if (muted) return null
    try {
      if (!ctx) ctx = ctxFactory()
      if (!ctx) return null
      if (ctx.state === 'suspended') void ctx.resume()
      return ctx
    } catch {
      return null
    }
  }

  function tone(f: number, dur: number, type: Wave, vol: number, to: number | null, delay: number): void {
    const a = ac()
    if (!a) return
    const t = a.currentTime + delay
    const o = a.createOscillator()
    const g = a.createGain()
    o.type = type
    o.frequency.setValueAtTime(f, t)
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g)
    g.connect(a.destination)
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  function sound(n: SfxName, d: number): void {
    SOUNDS[n](tone, d)
  }

  return {
    play(name, delay = 0) {
      try {
        sound(name, delay)
      } catch {
        // sound is never fatal
      }
    },
    setMuted(m) {
      muted = m
    },
    isMuted: () => muted,
  }
}

export const sfx = createSfx()
