import { buzz } from '../../lib/haptics'
import { sfx } from '../../lib/sound'
import type { Verdict } from './store'

export const WIN_DELAY_MS = 1800
const ERROR_BUZZ = [30, 40, 30]
const WIN_BUZZ = [40, 60, 40, 60, 160]

/** Sound and vibration for a verdict (PasMobile submit). */
export function playVerdict(v: Verdict, vibrate: boolean): void {
  if (v.bulls) {
    sfx.play('hooves')
    sfx.play('bull', 0.75)
  }
  if (v.cows) {
    sfx.play('bell', v.bulls ? 1.2 : 0.4)
    sfx.play('cow', v.bulls ? 1.5 : 0.8)
  }
  if (!v.bulls && !v.cows) sfx.play('miss')
  buzz(v.bulls ? [30, 40, 30, 40, 30] : 20, vibrate)
}

export function playRejected(vibrate: boolean): void {
  sfx.play('err')
  buzz(ERROR_BUZZ, vibrate)
}

export function playWin(vibrate: boolean): void {
  sfx.play('win')
  sfx.play('chirp', 0.6)
  buzz(WIN_BUZZ, vibrate)
}
