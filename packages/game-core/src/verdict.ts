export interface Verdict {
  readonly bulls: number
  readonly cows: number
}

export function bullsCows(secret: string, guess: string): Verdict {
  let bulls = 0
  let cows = 0
  for (let i = 0; i < guess.length; i++) {
    if (secret[i] === guess[i]) bulls++
    else if (secret.includes(guess[i])) cows++
  }
  return { bulls, cows }
}
