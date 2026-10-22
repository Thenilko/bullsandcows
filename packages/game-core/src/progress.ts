export interface SceneProgress {
  readonly prog: number
  readonly fog: number
  readonly sunY: number
  readonly dawn: number
}

function fromProg(prog: number): SceneProgress {
  return {
    prog,
    fog: 0.9 * (1 - prog),
    sunY: 176 - 150 * prog,
    dawn: 0.75 * (1 - prog),
  }
}

/** Scene state from remaining candidates: prog = 1 - ln(left) / ln(total). */
export function progress(left: number, total: number): SceneProgress {
  if (left <= 1 || total <= 1) return fromProg(1)
  return fromProg(1 - Math.log(left) / Math.log(total))
}

/** Scene outside a game. */
export const IDLE_PROGRESS: SceneProgress = fromProg(0.8)

/**
 * Sun height on the wide desktop scene (1600×900 artboard): sunY = 380 − prog·260, from 380 at the start of a
 * game to 120 at the end. The mobile scene keeps `sunY` above (176 − 150·prog on the 390×380 artboard).
 */
export function wideSunY(prog: number): number {
  return 380 - 260 * prog
}
