import { useKeyboard } from '../../features/solo/useKeyboard'
import { useIsDesktop } from '../../hooks/useIsDesktop'

export interface DuelKeys {
  /** The keypad takes input right now (my turn, number not hidden yet, notebook closed…). */
  active: boolean
  zero: boolean
  press(d: string): void
  back(): void
  submit(): void
}

/** Desktop typing in duels and against the bot, like the solo game: digits, Backspace, Enter. */
export function useDuelKeyboard({ active, zero, press, back, submit }: DuelKeys): void {
  const desktop = useIsDesktop()
  useKeyboard({
    enabled: desktop && active,
    started: true,
    // The keypad has no 0 in a game without zero; the keyboard must not slip one in either.
    onDigit: (d) => {
      if (zero || d !== '0') press(d)
    },
    onBack: back,
    onEnter: submit,
    onStart: () => undefined,
  })
}
