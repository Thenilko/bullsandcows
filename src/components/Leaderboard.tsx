import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { fmtTime, plural, todayKey } from "../game/logic";
import { Avatar } from "./Avatar";

type Mode = "daily" | "total" | "wins";
interface Row {
  user_id: string;
  username: string;
  avatar_url: string | null;
  score?: number;
  tries?: number;
  ms?: number;
  total?: number;
  wins?: number;
  games?: number;
  duel_wins?: number;
}

interface Props {
  userId: string | null;
  refreshKey: number;
}

export function Leaderboard({ userId, refreshKey }: Props) {
  const [mode, setMode] = useState<Mode>("daily");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    setRows(null);
    const q =
      mode === "daily"
        ? supabase.from("leaderboard_daily").select("*").eq("daily_date", todayKey()).order("score", { ascending: false }).limit(30)
        : mode === "total"
          ? supabase.from("leaderboard_total").select("*").gt("total", 0).order("total", { ascending: false }).limit(30)
          : supabase.from("leaderboard_total").select("*").gt("wins", 0).order("wins", { ascending: false }).limit(30);
    q.then(({ data, error }) => {
      if (cancelled) return;
      if (error) { setError(error.message); setRows([]); return; }
      setError(""); setRows((data ?? []) as Row[]);
    });
    return () => { cancelled = true; };
  }, [mode, refreshKey]);

  const note = mode === "daily" ? `Число на деня, ${new Date().toLocaleDateString("bg-BG")}` : mode === "total" ? "Всички соло игри" : "Брой познати числа";

  return (
    <main>
      <section className="panel wide">
        <div className="opts" style={{ justifyContent: "space-between" }}>
          <div className="segs" role="tablist">
            <button role="tab" aria-selected={mode === "daily"} onClick={() => setMode("daily")}>Число на деня</button>
            <button role="tab" aria-selected={mode === "total"} onClick={() => setMode("total")}>Общо точки</button>
            <button role="tab" aria-selected={mode === "wins"} onClick={() => setMode("wins")}>Победи</button>
          </div>
          <span className="help">{note}</span>
        </div>
        <div className="board">
          {!supabase && <div className="empty">Класирането работи с Supabase. Попълни .env и пусни отново.</div>}
          {supabase && rows === null && <div className="empty">Зареждам класирането…</div>}
          {error && <div className="empty">Не успях да заредя класирането: {error}</div>}
          {rows && !rows.length && !error && (
            <div className="empty">Още няма резултати. {mode === "daily" ? "Пусни „Число на деня“ и бъди първи." : "Изиграй една игра и ще се появиш тук."}</div>
          )}
          {rows?.map((r, i) => (
            <div key={r.user_id} className={"brow" + (r.user_id === userId ? " me" : "")} style={{ animationDelay: `${i * 40}ms` }}>
              <span className="rk">{i + 1}</span>
              <Avatar url={r.avatar_url} name={r.username} />
              <span className="nm">
                {r.username}
                <small>
                  {mode === "daily" && `${plural(r.tries ?? 0, "опит", "опита")} · ${fmtTime(r.ms ?? 0)}`}
                  {mode === "total" && `${plural(r.wins ?? 0, "победа", "победи")} от ${plural(r.games ?? 0, "игра", "игри")}`}
                  {mode === "wins" && `${r.duel_wins ? plural(r.duel_wins, "спечелен дуел", "спечелени дуела") + " · " : ""}${plural(r.games ?? 0, "игра", "игри")}`}
                </small>
              </span>
              <span className="sc">
                {mode === "daily" ? r.score : mode === "total" ? r.total : r.wins}
                <small>{mode === "wins" ? "победи" : "точки"}</small>
              </span>
            </div>
          ))}
        </div>
        <div className="rules">
          <p><b>Как се смятат точките.</b> Всяка дължина има пар: 4 опита за 3 цифри, 6 за 4, 7 за 5. Точки = база × (пар ÷ опити) × бонус за време до 25%. Подсказка струва 2 опита. В „Число на деня“ влизат само игри с числото на деня, за да решават всички едно и също число.</p>
        </div>
      </section>
    </main>
  );
}
