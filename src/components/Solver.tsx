import { useEffect, useRef, useState } from "react";
import { allCodes, filterCandidates, pickGuess, plural, randomCode, scoreGuess, type Guessed, type Len } from "../game/logic";
import { bigText, confetti, reduced, ripple, sfx } from "../lib/fx";

interface S {
  len: Len;
  cands: string[];
  guess: string;
  log: Guessed[];
  b: number;
  c: number;
  done: boolean;
  msg: { text: string; cls: string };
}

const fresh = (len: Len): S => {
  const cands = allCodes(len);
  return { len, cands, guess: cands[Math.floor(Math.random() * cands.length)], log: [], b: 0, c: 0, done: false, msg: { text: "Намисли число и отговори.", cls: "" } };
};

/** Режимът, в който компютърът познава твоето число. Работи изцяло в браузъра. */
export function Solver() {
  const [s, setS] = useState<S>(() => fresh(4));
  const [thinking, setThinking] = useState<string | null>(null);
  const total = useRef(allCodes(s.len).length);

  useEffect(() => { total.current = allCodes(s.len).length; }, [s.len]);

  const reset = (len: Len) => { setThinking(null); setS(fresh(len)); };
  const step = (k: "b" | "c", d: number) => { sfx.tick(); setS((p) => ({ ...p, [k]: Math.max(0, Math.min(p.len, p[k] + d)) })); };

  const answer = () => {
    if (s.done || thinking !== null) return;
    if (s.b + s.c > s.len) { sfx.err(); setS((p) => ({ ...p, msg: { text: `Бикове плюс крави не може да е повече от ${p.len}.`, cls: "err" } })); return; }
    if (s.b === s.len - 1 && s.c === 1) { sfx.err(); setS((p) => ({ ...p, msg: { text: `Невъзможен отговор: ${p.len - 1} бика и 1 крава не може да се случи.`, cls: "err" } })); return; }
    const log = [...s.log, { guess: s.guess, bulls: s.b, cows: s.c }];
    if (s.b === s.len) {
      setS((p) => ({ ...p, log, done: true, msg: { text: `Компютърът позна от ${plural(log.length, "опит", "опита")}!`, cls: "win" } }));
      sfx.win(); confetti(); bigText("🐂".repeat(s.len));
      return;
    }
    const cands = filterCandidates(s.cands, [log[log.length - 1]]);
    if (!cands.length) {
      sfx.err();
      setS((p) => ({ ...p, log, cands, done: true, msg: { text: "Няма число, което отговаря на всички отговори. Някъде е сбъркано. Започни отначало.", cls: "err" } }));
      return;
    }
    const next = pickGuess(cands);
    setS((p) => ({ ...p, log, cands, b: 0, c: 0, msg: { text: "Мисля…", cls: "" } }));
    const finish = () => {
      setThinking(null);
      sfx.key();
      setS((p) => ({ ...p, guess: next, msg: { text: cands.length === 1 ? "Остана само един вариант. Това трябва да е то." : `Остават ${plural(cands.length, "вариант", "варианта")}.`, cls: "" } }));
    };
    if (reduced) { finish(); return; }
    const t0 = Date.now();
    const spin = () => {
      setThinking(randomCode(s.len)); sfx.tick();
      if (Date.now() - t0 < 800) setTimeout(spin, 60); else finish();
    };
    spin();
  };

  return (
    <main>
      <section className="panel">
        <div className="opts">
          <label>Цифри
            <select value={s.len} onChange={(e) => reset(Number(e.target.value) as Len)}>
              <option value={3}>3</option><option value={4}>4</option><option value={5}>5</option>
            </select>
          </label>
          <button className="btn slim" onClick={() => reset(s.len)}>Започни отначало</button>
        </div>
        <div className="label">Предложение на компютъра</div>
        <div className={"cguess" + (thinking !== null ? " think" : "")}>{thinking ?? s.guess}</div>
        <div className={"msg " + s.msg.cls} aria-live="polite">{s.msg.text}</div>
        <div className="steppers">
          <div className="step b"><button onClick={() => step("b", -1)}>−</button><output>{s.b}<small>🐂 бика</small></output><button onClick={() => step("b", 1)}>+</button></div>
          <div className="step c"><button onClick={() => step("c", -1)}>−</button><output>{s.c}<small>🐄 крави</small></output><button onClick={() => step("c", 1)}>+</button></div>
        </div>
        <button className="btn primary" disabled={s.done || thinking !== null} onClick={(e) => { ripple(e.currentTarget, e); answer(); }}>Отговори</button>
        <div className="rules">
          <p>Намисли число с различни цифри, първата не е 0. Компютърът предлага, ти казваш колко бика и крави има.</p>
          <p>Компютърът пресява всички възможни числа и избира опита, който най-добре разделя останалите варианти.</p>
        </div>
      </section>
      <section className="panel right">
        <div className="stats">
          <div className="stat"><span className="label">Опити</span><b>{s.log.length}</b></div>
          <div className="stat" style={{ gridColumn: "span 2" }}><span className="label">Остават варианти</span><b>{s.cands.length}</b></div>
        </div>
        <div className="bar"><i style={{ width: `${Math.max(1.5, (100 * s.cands.length) / total.current)}%` }} /></div>
        <div className="label">Ход на играта</div>
        <div className="log">
          {!s.log.length && <div className="empty">Отговори на първото предложение.</div>}
          {s.log.map((h, i) => (
            <div key={i} className={"row" + (h.bulls === s.len ? " win" : "")}>
              <span className="n">{i + 1}</span>
              <span className="g">{h.guess}</span>
              <span className="r"><span className="pill b">{h.bulls} 🐂</span><span className="pill c">{h.cows} 🐄</span></span>
            </div>
          ))}
        </div>
        {s.done && s.log.length > 0 && s.log[s.log.length - 1].bulls === s.len && (
          <p className="help">Проверка: {s.log.slice(0, -1).every((h) => { const v = scoreGuess(h.guess, s.guess); return v.bulls === h.bulls && v.cows === h.cows; }) ? "всичките ти отговори бяха последователни." : "някой от отговорите ти не съвпада с крайното число."}</p>
        )}
      </section>
    </main>
  );
}
