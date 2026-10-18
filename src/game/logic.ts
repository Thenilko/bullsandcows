/**
 * Чиста логика на играта „Бикове и крави“.
 * Няма зависимости от DOM или мрежа, за да може да се тества и да се ползва
 * еднакво в браузъра и при проверка на сървъра.
 */

export type Len = 3 | 4 | 5;

/** Пар (очакван брой опити) и база точки за всяка дължина. */
export const PAR: Record<Len, number> = { 3: 4, 4: 6, 5: 7 };
export const BASE: Record<Len, number> = { 3: 600, 4: 1000, 5: 1500 };

export interface Verdict {
  bulls: number;
  cows: number;
}

/** Бикове = вярна цифра на вярно място; крави = вярна цифра на грешно място. */
export function scoreGuess(guess: string, secret: string): Verdict {
  let bulls = 0;
  let cows = 0;
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === secret[i]) bulls++;
    else if (secret.includes(guess[i])) cows++;
  }
  return { bulls, cows };
}

/** Валидно число: точно n различни цифри, първата не е 0. */
export function isValidCode(s: string, n: number): boolean {
  if (s.length !== n || !/^[0-9]+$/.test(s)) return false;
  if (s[0] === "0") return false;
  return new Set(s).size === n;
}

/** Всички валидни числа с дължина n (за 4 цифри са 4536). */
export function allCodes(n: number): string[] {
  const out: string[] = [];
  const rec = (prefix: string, used: number) => {
    if (prefix.length === n) {
      out.push(prefix);
      return;
    }
    for (let d = 0; d <= 9; d++) {
      if (used & (1 << d)) continue;
      if (prefix.length === 0 && d === 0) continue;
      rec(prefix + d, used | (1 << d));
    }
  };
  rec("", 0);
  return out;
}

/** Детерминистичен генератор (mulberry32), за числото на деня в локален режим. */
export function mulberry(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomCode(n: number, rng: () => number = Math.random): string {
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = 9; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  if (digits[0] === 0) {
    const k = digits.findIndex((d) => d !== 0);
    [digits[0], digits[k]] = [digits[k], digits[0]];
  }
  return digits.slice(0, n).join("");
}

/** Ключ на деня във формат YYYY-MM-DD (UTC), еднакъв за всички играчи. */
export function todayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Локално число на деня. На сървъра се ползва daily_secret() със сол. */
export function dailyCode(n: number, key: string = todayKey()): string {
  return randomCode(n, mulberry(Number(key.replace(/-/g, "")) + n * 7919));
}

export interface Guessed {
  guess: string;
  bulls: number;
  cows: number;
}

/** Числата, които още отговарят на всички получени отговори. */
export function filterCandidates(cands: string[], history: Guessed[]): string[] {
  return cands.filter((c) =>
    history.every((h) => {
      const v = scoreGuess(h.guess, c);
      return v.bulls === h.bulls && v.cows === h.cows;
    }),
  );
}

/**
 * Избор на следващ опит за компютъра (минимакс по Кнут): опитът, чийто
 * най-лош възможен отговор оставя най-малко кандидати. При много кандидати
 * се взима случаен, за да е бързо.
 */
export function pickGuess(cands: string[], rng: () => number = Math.random): string {
  if (cands.length <= 2) return cands[0];
  if (cands.length > 1300) return cands[Math.floor(rng() * cands.length)];
  let best = cands[0];
  let bestWorst = Infinity;
  for (const g of cands) {
    const buckets = new Map<number, number>();
    let worst = 0;
    for (const c of cands) {
      const v = scoreGuess(g, c);
      const key = v.bulls * 10 + v.cows;
      const n = (buckets.get(key) ?? 0) + 1;
      buckets.set(key, n);
      if (n > worst) worst = n;
      if (worst >= bestWorst) break;
    }
    if (worst < bestWorst) {
      bestWorst = worst;
      best = g;
    }
  }
  return best;
}

export interface Score {
  score: number;
  stars: 1 | 2 | 3 | 4 | 5;
  label: string;
  timeBonus: number;
  par: number;
}

const LABELS = ["", "Може и по-добре", "Прилично", "Добре", "Отлично", "Гениално"];

/**
 * Точки = база × min(1.5, пар ÷ опити) × (1 + бонус за време до 25%).
 * Същата формула живее и в SQL функцията compute_score, за да съвпадат.
 */
export function computeScore(n: Len, tries: number, ms: number): Score {
  const skill = Math.min(1.5, PAR[n] / Math.max(1, tries));
  const timeBonus = Math.max(0, 1 - ms / 1000 / 300) * 0.25;
  const score = Math.round(BASE[n] * skill * (1 + timeBonus));
  const diff = tries - PAR[n];
  const stars: Score["stars"] = diff <= -2 ? 5 : diff <= -1 ? 4 : diff <= 0 ? 3 : diff <= 2 ? 2 : 1;
  return { score, stars, label: LABELS[stars], timeBonus, par: PAR[n] };
}

export const fmtTime = (ms: number): string => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;
