import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { GameService } from "../game/service";
import { allCodes, computeScore, filterCandidates, fmtTime, plural, type Guessed, type Len, type Score } from "../game/logic";
import { bigText, confetti, ripple, sfx } from "../lib/fx";
import { Result } from "./Result";

type Mark = "x" | "ok" | "";
interface State {
  id: string | null;
  len: Len;
  daily: boolean;
  duel: boolean;
  guess: string;
  history: Guessed[];
  marks: Record<string, Mark>;
  known: Record<number, string>;
  over: boolean;
  startedAt: number;
  penalty: number;
  last: { bulls: number; cows: number } | null;
  ending: "" | "won" | "lost";
  secret: string;
  msg: { text: string; cls: string };
  busy: boolean;
}

export interface Outcome {
  res: Score;
  tries: number;
  ms: number;
  daily: boolean;
  duel: boolean;
}

export interface PlayHandle {
  /** Предаване отвън (например противникът в дуел е спечелил). */
  endLost: (text: string) => void;
}

interface Props {
  service: GameService;
  saved: boolean; // дали резултатът се записва на сървър
  active: boolean; // дали табът е видим (клавиатурата работи само тогава)
  onOutcome?: (o: Outcome) => void;
  onProgress?: (tries: number, bulls: number) => void;
  duel?: { gameId: string; len: Len } | null;
  children?: React.ReactNode; // лента над дъската (дуел)
}

interface Rec { tries?: number; time?: number; score?: number; wins?: number }
const recKey = (n: number) => `bk-rec-${n}`;
function loadRec(n: number): Rec {
  try { return JSON.parse(localStorage.getItem(recKey(n)) ?? "{}"); } catch { return {}; }
}
function saveRec(n: number, r: Rec) {
  try { localStorage.setItem(recKey(n), JSON.stringify(r)); } catch { /* ignore */ }
}

const initial = (len: Len): State => ({
  id: null, len, daily: false, duel: false, guess: "", history: [], marks: {}, known: {}, over: true,
  startedAt: Date.now(), penalty: 0, last: null, ending: "", secret: "", msg: { text: "", cls: "" }, busy: false,
});

export const Play = forwardRef<PlayHandle, Props>(function Play({ service, saved, active, onOutcome, onProgress, duel, children }, ref) {
  const [s, setS] = useState<State>(() => initial(4));
  const [len, setLen] = useState<Len>(4);
  const [daily, setDaily] = useState(false);
  const [shake, setShake] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [rec, setRec] = useState<Rec>(() => loadRec(4));
  const sRef = useRef(s);
  sRef.current = s;

  const setMsg = (text: string, cls = "") => setS((p) => ({ ...p, msg: { text, cls } }));
  const fail = (text: string) => { setMsg(text, "err"); setShake((k) => k + 1); sfx.err(); };

  const newGame = useCallback(async (l: Len, d: boolean, ext?: { gameId: string; len: Len }) => {
    setOutcome(null);
    try {
      const g = ext ? { id: ext.gameId, len: ext.len, daily: false } : await service.newGame(l, d);
      setRec(loadRec(g.len));
      setS({
        ...initial(g.len), id: g.id, daily: g.daily, duel: !!ext, over: false, startedAt: Date.now(),
        msg: { text: ext ? "Дуел! Кой пръв ще познае?" : g.daily ? `Число на деня за ${new Date().toLocaleDateString("bg-BG")}. Еднакво е за всички днес.` : `Въведи ${g.len} различни цифри.`, cls: "" },
      });
    } catch (e) {
      setS((p) => ({ ...p, msg: { text: (e as Error).message, cls: "err" } }));
    }
  }, [service]);

  // старт: обикновена игра или дуел отвън
  useEffect(() => {
    if (duel) newGame(duel.len, false, duel);
    else newGame(len, daily);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duel?.gameId]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const type = (d: string) => {
    const p = sRef.current;
    if (p.over || p.busy || p.guess.length >= p.len) return;
    if (p.guess.includes(d)) return fail(`Цифрата ${d} вече е въведена.`);
    if (!p.guess.length && d === "0") return fail("Първата цифра не може да е 0.");
    sfx.key();
    setS((q) => ({ ...q, guess: q.guess + d, msg: { text: "", cls: "" } }));
  };
  const back = () => setS((p) => (p.over ? p : { ...p, guess: p.guess.slice(0, -1) }));
  const cycleMark = (d: string) => {
    sfx.tick();
    setS((p) => ({ ...p, marks: { ...p.marks, [d]: p.marks[d] === "x" ? "ok" : p.marks[d] === "ok" ? "" : "x" } }));
  };

  const finishWon = (p: State, tries: number, ms: number) => {
    const res = computeScore(p.len, tries, ms);
    const r = loadRec(p.len); const news: string[] = [];
    if (!p.duel) {
      if (r.tries == null || tries < r.tries) { r.tries = tries; news.push("нов рекорд по опити"); }
      if (r.time == null || ms < r.time) { r.time = ms; news.push("нов рекорд по време"); }
      if (r.score == null || res.score > r.score) r.score = res.score;
      r.wins = (r.wins ?? 0) + 1; saveRec(p.len, r); setRec(r);
    }
    const o: Outcome = { res, tries, ms, daily: p.daily, duel: p.duel };
    setTimeout(() => { sfx.win(); confetti(); bigText("ПОЗНА!"); }, 200);
    setTimeout(() => setOutcome(o), 1500);
    onOutcome?.(o);
    return `Позна! ${plural(tries, "опит", "опита")} за ${fmtTime(ms)}${news.length ? ". " + news.join(", ") + "!" : "."}`;
  };

  const submit = async () => {
    const p = sRef.current;
    if (p.over || p.busy || !p.id) return;
    if (p.guess.length < p.len) return fail(`Въведи ${p.len} цифри.`);
    if (p.history.some((h) => h.guess === p.guess)) return fail("Този опит вече го направи.");
    setS((q) => ({ ...q, busy: true }));
    try {
      const r = await service.guess(p.id, p.guess);
      for (let i = 0; i < r.bulls; i++) sfx.bull(i);
      for (let i = 0; i < r.cows; i++) sfx.cow(r.bulls + i);
      const history = [...p.history, { guess: p.guess, bulls: r.bulls, cows: r.cows }];
      const marks = { ...p.marks };
      if (r.bulls === 0 && r.cows === 0) for (const d of p.guess) marks[d] = "x";
      onProgress?.(history.length, r.bulls);
      if (r.won) {
        const tries = history.length + p.penalty;
        const ms = r.ms ?? Date.now() - p.startedAt;
        const text = finishWon({ ...p, history }, tries, ms);
        setS((q) => ({ ...q, busy: false, over: true, guess: "", history, marks, last: { bulls: r.bulls, cows: r.cows }, ending: "won", secret: p.guess, msg: { text, cls: "win" } }));
      } else {
        setS((q) => ({ ...q, busy: false, guess: "", history, marks, last: { bulls: r.bulls, cows: r.cows }, msg: { text: `${plural(r.bulls, "бик", "бика")} и ${plural(r.cows, "крава", "крави")}.`, cls: "" } }));
      }
    } catch (e) {
      setS((q) => ({ ...q, busy: false }));
      fail((e as Error).message);
    }
  };

  const hint = async () => {
    const p = sRef.current;
    if (p.over || p.busy || p.duel || !p.id) return;
    try {
      const h = await service.hint(p.id);
      sfx.tick();
      setS((q) => ({ ...q, known: { ...q.known, [h.pos]: h.digit }, marks: { ...q.marks, [h.digit]: "ok" }, penalty: q.penalty + 2, guess: "", msg: { text: `На позиция ${h.pos + 1} е ${h.digit}. Това струва 2 опита.`, cls: "" } }));
    } catch (e) { fail((e as Error).message); }
  };

  const giveUp = async (text?: string) => {
    const p = sRef.current;
    if (p.over || !p.id) return;
    try {
      const { secret } = await service.giveUp(p.id);
      if (!text) sfx.err();
      setS((q) => ({ ...q, over: true, guess: "", last: null, ending: "lost", secret, msg: { text: text ?? `Числото беше ${secret}. Нова игра?`, cls: "err" } }));
    } catch (e) { fail((e as Error).message); }
  };

  useImperativeHandle(ref, () => ({ endLost: (text) => giveUp(text) }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (!active || ["INPUT", "SELECT", "TEXTAREA"].includes(t.tagName) || outcome) return;
      if (/^[0-9]$/.test(e.key)) type(e.key);
      else if (e.key === "Backspace") back();
      else if (e.key === "Enter") submit();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome, active]);

  const total = allCodes(s.len).length;
  const left = filterCandidates(allCodes(s.len), s.history).length;
  const elapsed = s.over ? null : now - s.startedAt;
  const shown = s.ending ? s.secret : s.guess;

  return (
    <main>
      <section className="panel">
        {children}
        {!s.duel && (
          <div className="opts">
            <label>Цифри
              <select value={len} onChange={(e) => { const l = Number(e.target.value) as Len; setLen(l); newGame(l, daily); }}>
                <option value={3}>3</option><option value={4}>4</option><option value={5}>5</option>
              </select>
            </label>
            <label><input type="checkbox" checked={daily} onChange={(e) => { setDaily(e.target.checked); newGame(len, e.target.checked); }} /> Число на деня</label>
            <button className="btn slim" onClick={() => newGame(len, daily)}>Нова игра</button>
          </div>
        )}
        <div className={"slots" + (shake ? " shake" : "")} key={shake}>
          {Array.from({ length: s.len }, (_, i) => {
            let cls = "slot";
            if (s.ending) cls += " " + s.ending;
            else {
              if (i === s.guess.length && !s.over) cls += " active";
              if (s.known[i] && !s.guess[i]) cls += " known";
              if (i === s.guess.length - 1) cls += " filled";
            }
            return <div key={i} className={cls} style={s.ending ? { animationDelay: `${i * 80}ms` } : undefined}>{shown[i] || s.known[i] || ""}</div>;
          })}
        </div>
        <div className="verdict">
          {s.last && !s.last.bulls && !s.last.cows && <span className="tok z">нищо</span>}
          {s.last && Array.from({ length: s.last.bulls }, (_, i) => <span key={"b" + i} className="tok b" style={{ animationDelay: `${i * 120}ms` }}>🐂</span>)}
          {s.last && Array.from({ length: s.last.cows }, (_, i) => <span key={"c" + i} className="tok c" style={{ animationDelay: `${(s.last!.bulls + i) * 120}ms` }}>🐄</span>)}
        </div>
        <div className={"msg " + s.msg.cls} aria-live="polite">{s.msg.text}</div>
        <Keypad guess={s.guess} marks={s.marks} disabled={s.over} onType={type} onMark={cycleMark} />
        <p className="help">Цифрите са различни, първата не е 0. Задръж цифра (или десен бутон), за да я отбележиш като изключена или сигурна. Опит с 0 бика и 0 крави зачертава цифрите сам.</p>
        <div className="actions">
          <button className="btn" onClick={back} disabled={s.over} title="Изтрий">⌫</button>
          <button className="btn" onClick={hint} disabled={s.over || s.duel} title="Разкрива една цифра. Струва 2 опита.">💡 Подсказка</button>
          <button className="btn primary" onClick={(e) => { ripple(e.currentTarget, e); submit(); }} disabled={s.over || s.busy}>Проверка</button>
        </div>
        <button className="btn slim" onClick={() => giveUp()} disabled={s.over}>Предавам се</button>
      </section>

      <section className="panel right">
        <div className="stats">
          <div className="stat"><span className="label">Опити</span><b>{s.history.length}{s.penalty ? ` +${s.penalty}` : ""}</b></div>
          <div className="stat"><span className="label">Време</span><b>{fmtTime(elapsed ?? 0)}</b></div>
          <div className="stat"><span className="label">Възможни</span><b>{left}</b></div>
        </div>
        <div className="bar"><i style={{ width: `${Math.max(1.5, (100 * left) / total)}%` }} /></div>
        <div className="label">Дневник на опитите</div>
        <div className="log">
          {!s.history.length && <div className="empty">Още няма опити. Въведи число и натисни Проверка.</div>}
          {s.history.map((h, i) => (
            <div key={i} className={"row" + (h.bulls === s.len ? " win" : "")}>
              <span className="n">{i + 1}</span>
              <span className="g">{h.guess}</span>
              <span className="r"><span className="pill b">{h.bulls} 🐂</span><span className="pill c">{h.cows} 🐄</span></span>
            </div>
          ))}
        </div>
        <div className="label">Твоите рекорди за {s.len} цифри</div>
        <div className="records">
          <div><span>Най-малко опити</span><b>{rec.tries ?? "—"}</b></div>
          <div><span>Най-бързо</span><b>{rec.time != null ? fmtTime(rec.time) : "—"}</b></div>
          <div><span>Най-много точки</span><b>{rec.score ?? "—"}</b></div>
        </div>
      </section>

      {outcome && (
        <Result
          outcome={outcome}
          saved={saved}
          onClose={() => setOutcome(null)}
          onNew={() => (s.duel ? setOutcome(null) : newGame(len, daily))}
        />
      )}
    </main>
  );
});

interface KeypadProps {
  guess: string;
  marks: Record<string, Mark>;
  disabled: boolean;
  onType: (d: string) => void;
  onMark: (d: string) => void;
}

function Keypad({ guess, marks, disabled, onType, onMark }: KeypadProps) {
  const hold = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  return (
    <div className="keys">
      {Array.from({ length: 10 }, (_, d) => {
        const k = String(d);
        const m = marks[k];
        const cls = (guess.includes(k) ? "used " : "") + (m === "x" ? "excl" : m === "ok" ? "sure" : "");
        return (
          <button
            key={k} type="button" className={cls} disabled={disabled}
            onClick={(e) => { if (!hold.current) { ripple(e.currentTarget, e); onType(k); } hold.current = false; }}
            onContextMenu={(e) => { e.preventDefault(); onMark(k); }}
            onPointerDown={() => { timer.current = window.setTimeout(() => { hold.current = true; onMark(k); }, 450); }}
            onPointerUp={() => clearTimeout(timer.current)}
            onPointerLeave={() => clearTimeout(timer.current)}
            onPointerCancel={() => clearTimeout(timer.current)}
          >
            {k}
          </button>
        );
      })}
    </div>
  );
}
