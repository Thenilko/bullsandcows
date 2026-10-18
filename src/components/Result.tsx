import { useEffect } from "react";
import { fmtTime } from "../game/logic";
import { sfx } from "../lib/fx";
import type { Outcome } from "./Play";

interface Props {
  outcome: Outcome;
  saved: boolean;
  onClose: () => void;
  onNew: () => void;
}

export function Result({ outcome, saved, onClose, onNew }: Props) {
  const { res, tries, ms, daily, duel } = outcome;
  useEffect(() => {
    const ts: number[] = [];
    for (let i = 1; i <= res.stars; i++) ts.push(window.setTimeout(sfx.pop, i * 120));
    return () => ts.forEach(clearTimeout);
  }, [res.stars]);

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="result" role="dialog" aria-label="Резултат">
        <h2>{duel ? "Дуелът е твой!" : "Резултат"}</h2>
        <div className="stars">
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={i <= res.stars ? "on" : ""} style={{ animationDelay: `${i * 120}ms` }}>★</span>
          ))}
        </div>
        <div className="score">{res.score}<small>точки</small></div>
        <div className="rating">{res.label}</div>
        <div className="break">
          <div><span>Опити</span><b>{tries} <span style={{ color: "var(--fg-dim)", fontFamily: "var(--body)", fontWeight: 600 }}>(пар {res.par})</span></b></div>
          <div><span>Време</span><b>{fmtTime(ms)}</b></div>
          <div><span>Бонус за бързина</span><b>+{Math.round(res.timeBonus * 100)}%</b></div>
          {daily && <div><span>Число на деня</span><b>да</b></div>}
        </div>
        <div className={"saved" + (saved ? "" : " no")}>
          {saved ? (duel ? "Дуелът е записан в профила ти." : "Записано в класирането ✓") : "Влез в профила си, за да влизаш в класирането."}
        </div>
        <div className="actions">
          <button className="btn" onClick={onClose}>Затвори</button>
          <button className="btn primary" onClick={onNew}>{duel ? "Към стаята" : "Нова игра"}</button>
        </div>
      </div>
    </div>
  );
}
