import { supabase } from "../lib/supabase";
import { dailyCode, isValidCode, randomCode, scoreGuess, computeScore, type Len } from "./logic";

export interface GameStart {
  id: string;
  len: Len;
  daily: boolean;
}
export interface GuessResult {
  bulls: number;
  cows: number;
  won: boolean;
  tries: number;
  score: number | null;
  ms: number | null;
}

/**
 * Единен интерфейс към играта. Локалната версия пази тайното число в паметта
 * на браузъра; онлайн версията го пази само на сървъра и всяка проверка минава
 * през Postgres функция, за да не може числото да се види в конзолата.
 */
export interface GameService {
  readonly mode: "local" | "online";
  newGame(len: Len, daily: boolean): Promise<GameStart>;
  guess(id: string, guess: string): Promise<GuessResult>;
  hint(id: string): Promise<{ pos: number; digit: string }>;
  giveUp(id: string): Promise<{ secret: string }>;
}

interface LocalGame {
  secret: string;
  len: Len;
  tries: number;
  penalty: number;
  known: Set<number>;
  guesses: Set<string>;
  startedAt: number;
  done: boolean;
}

export class LocalService implements GameService {
  readonly mode = "local" as const;
  private games = new Map<string, LocalGame>();

  async newGame(len: Len, daily: boolean): Promise<GameStart> {
    const id = Math.random().toString(36).slice(2);
    this.games.set(id, {
      secret: daily ? dailyCode(len) : randomCode(len),
      len,
      tries: 0,
      penalty: 0,
      known: new Set(),
      guesses: new Set(),
      startedAt: Date.now(),
      done: false,
    });
    return { id, len, daily };
  }

  private get(id: string): LocalGame {
    const g = this.games.get(id);
    if (!g) throw new Error("Няма такава игра.");
    if (g.done) throw new Error("Играта е приключила.");
    return g;
  }

  async guess(id: string, guess: string): Promise<GuessResult> {
    const g = this.get(id);
    if (!isValidCode(guess, g.len)) throw new Error("Невалидно число.");
    if (g.guesses.has(guess)) throw new Error("Този опит вече го направи.");
    g.guesses.add(guess);
    g.tries++;
    const v = scoreGuess(guess, g.secret);
    const won = v.bulls === g.len;
    let score: number | null = null;
    let ms: number | null = null;
    if (won) {
      g.done = true;
      ms = Date.now() - g.startedAt;
      score = computeScore(g.len, g.tries + g.penalty, ms).score;
    }
    return { ...v, won, tries: g.tries, score, ms };
  }

  async hint(id: string): Promise<{ pos: number; digit: string }> {
    const g = this.get(id);
    const free = [...Array(g.len).keys()].filter((i) => !g.known.has(i));
    if (!free.length) throw new Error("Няма повече подсказки.");
    const pos = free[Math.floor(Math.random() * free.length)];
    g.known.add(pos);
    g.penalty += 2;
    return { pos, digit: g.secret[pos] };
  }

  async giveUp(id: string): Promise<{ secret: string }> {
    const g = this.get(id);
    g.done = true;
    return { secret: g.secret };
  }
}

function rpcError(e: unknown): Error {
  const msg = (e as { message?: string })?.message ?? "Грешка при връзка със сървъра.";
  const map: Record<string, string> = {
    "not signed in": "Трябва да си влязъл.",
    "invalid guess": "Невалидно число.",
    "repeated guess": "Този опит вече го направи.",
    "game finished": "Играта е приключила.",
    "game not found": "Няма такава игра.",
    "no hints in duel": "В дуел няма подсказки.",
    "no more hints": "Няма повече подсказки.",
    "duel not found": "Няма стая с този код.",
  };
  return new Error(map[msg] ?? msg);
}

export class OnlineService implements GameService {
  readonly mode = "online" as const;

  private async rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    if (!supabase) throw new Error("Няма връзка със Supabase.");
    const { data, error } = await supabase.rpc(fn, args);
    if (error) throw rpcError(error);
    return data as T;
  }

  async newGame(len: Len, daily: boolean): Promise<GameStart> {
    const id = await this.rpc<string>("new_game", { p_len: len, p_daily: daily });
    return { id, len, daily };
  }

  async guess(id: string, guess: string): Promise<GuessResult> {
    const r = await this.rpc<{ bulls: number; cows: number; won: boolean; tries: number; score: number | null; ms: number | null }>(
      "make_guess",
      { p_game: id, p_guess: guess },
    );
    return r;
  }

  async hint(id: string): Promise<{ pos: number; digit: string }> {
    const r = await this.rpc<{ pos: number; digit: string }>("use_hint", { p_game: id });
    return { pos: r.pos - 1, digit: r.digit }; // SQL брои от 1
  }

  async giveUp(id: string): Promise<{ secret: string }> {
    const secret = await this.rpc<string>("give_up", { p_game: id });
    return { secret };
  }

  /** Дуели: само онлайн. */
  async createDuel(len: Len): Promise<string> {
    return this.rpc<string>("create_duel", { p_len: len });
  }
  async joinDuel(code: string): Promise<{ game_id: string; len: Len; duel_id: string; winner_id: string | null }> {
    return this.rpc("join_duel", { p_code: code });
  }
}

export const service: GameService = supabase ? new OnlineService() : new LocalService();
