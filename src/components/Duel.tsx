import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { OnlineService, service } from "../game/service";
import { plural, type Len } from "../game/logic";
import { bigText, floatEmoji, sfx } from "../lib/fx";
import { Play, type PlayHandle } from "./Play";
import { Avatar } from "./Avatar";
import type { Profile } from "../hooks/useAuth";

interface Peer { id: string; name: string; avatar: string | null; tries: number; bulls: number; done: boolean }
interface PresencePayload { name: string; avatar: string | null; tries: number; bulls: number; done: boolean }
interface WinPayload { from: string; name: string; tries: number }
interface HistoryRow { who: string; tries: number; me: boolean; code: string }

interface Props {
  user: User | null;
  profile: Profile | null;
  active: boolean;
  onOutcome: () => void;
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const makeCode = () => Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
const REACTS = ["🔥", "😱", "👏", "🤔", "😂", "🐂"];

/**
 * Стая на живо през Supabase Realtime: присъствие за опитите на всеки и
 * broadcast за старт, победа и реакции. Числото идва от сървъра (create_duel)
 * и всеки играч получава своя игра с него (join_duel).
 */
export function Duel({ user, profile, active, onOutcome }: Props) {
  const online = service instanceof OnlineService ? service : null;
  const [room, setRoom] = useState("");
  const [codeIn, setCodeIn] = useState("");
  const [len, setLen] = useState<Len>(4);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [msg, setMsg] = useState("");
  const [game, setGame] = useState<{ gameId: string; len: Len } | null>(null);
  const [finished, setFinished] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const chan = useRef<RealtimeChannel | null>(null);
  const playRef = useRef<PlayHandle>(null);
  const mine = useRef<PresencePayload>({ name: "", avatar: null, tries: 0, bulls: 0, done: false });
  const gameRef = useRef(game); gameRef.current = game;
  const finishedRef = useRef(finished); finishedRef.current = finished;
  const roomRef = useRef(room); roomRef.current = room;

  const myName = profile?.username ?? "ти";

  const track = (patch: Partial<PresencePayload>) => {
    mine.current = { ...mine.current, name: myName, avatar: profile?.avatar_url ?? null, ...patch };
    chan.current?.track(mine.current);
  };

  useEffect(() => () => { if (chan.current) supabase?.removeChannel(chan.current); }, []);

  const join = (raw: string) => {
    if (!supabase || !user || !online) { setMsg("Трябва да си влязъл, за да играеш дуел."); return; }
    const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (code.length !== 4) { setMsg("Кодът е 4 знака."); return; }
    if (chan.current) supabase.removeChannel(chan.current);
    const ch = supabase.channel("duel:" + code, { config: { presence: { key: user.id }, broadcast: { self: true } } });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<PresencePayload>();
      setPeers(Object.entries(state).map(([id, arr]) => {
        const p = arr[0];
        return { id, name: p.name || "Играч", avatar: p.avatar ?? null, tries: p.tries ?? 0, bulls: p.bulls ?? 0, done: !!p.done };
      }));
    });
    ch.on("broadcast", { event: "start" }, ({ payload }) => onStart(String((payload as { duel: string }).duel ?? "")));
    ch.on("broadcast", { event: "win" }, ({ payload }) => onWin(payload as WinPayload));
    ch.on("broadcast", { event: "react" }, ({ payload }) => {
      const p = payload as { from: string; emoji: string };
      if (p.from !== user.id) floatEmoji(String(p.emoji).slice(0, 4));
    });
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") { track({ tries: 0, bulls: 0, done: false }); setMsg("Чакаме играчи. Натисни Старт, когато всички са тук."); }
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setMsg("Връзката със стаята се разпадна. Опитай пак.");
    });
    chan.current = ch;
    setRoom(code); setGame(null); setFinished(false); setPeers([]);
    setMsg("Свързвам се…");
  };

  const leave = () => {
    if (chan.current) supabase?.removeChannel(chan.current);
    chan.current = null;
    setRoom(""); setGame(null); setFinished(false); setPeers([]); setMsg("");
  };

  const start = async () => {
    if (!online || !chan.current) return;
    if (gameRef.current && !finishedRef.current) { setMsg("Дуелът вече тече."); return; }
    try {
      const duelCode = await online.createDuel(len);
      await chan.current.send({ type: "broadcast", event: "start", payload: { duel: duelCode } });
    } catch (e) { setMsg((e as Error).message); }
  };

  const onStart = async (duelCode: string) => {
    if (!online || !duelCode) return;
    if (gameRef.current && !finishedRef.current) return;
    try {
      const j = await online.joinDuel(duelCode);
      setFinished(false);
      setGame({ gameId: j.game_id, len: j.len });
      track({ tries: 0, bulls: 0, done: false });
      setMsg("Дуелът тече!");
      sfx.win(); bigText("СТАРТ!");
    } catch (e) { setMsg((e as Error).message); }
  };

  const onWin = (p: WinPayload) => {
    if (!gameRef.current || finishedRef.current || !user) return;
    setFinished(true);
    const me = p.from === user.id;
    setHistory((h) => [{ who: me ? "Ти" : p.name, tries: p.tries, me, code: roomRef.current }, ...h].slice(0, 10));
    if (me) { setMsg("Ти спечели дуела! Старт за реванш?"); return; }
    sfx.lose();
    playRef.current?.endLost(`${p.name} спечели за ${plural(p.tries, "опит", "опита")}.`);
    setMsg(`${p.name} спечели дуела. Старт за реванш?`);
  };

  const react = (emoji: string) => {
    floatEmoji(emoji);
    chan.current?.send({ type: "broadcast", event: "react", payload: { from: user?.id, emoji } });
  };

  const strip = room ? (
    <div className="duelstrip">
      <span style={{ fontWeight: 800 }}>⚔️ Стая {room}</span>
      {peers.map((p) => (
        <span key={p.id} className={"pp" + (p.done ? " done" : "")}>
          <Avatar url={p.avatar} name={p.name} size={24} />
          <span>{p.id === user?.id ? "ти" : p.name}: {p.tries}{game && !finished ? ` · ${p.bulls}🐂` : ""}</span>
        </span>
      ))}
      <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
        <button className="btn slim danger" onClick={start} disabled={!!game && !finished}>{game ? "Реванш" : "⚡ Старт"}</button>
        <button className="btn slim" onClick={leave}>Напусни</button>
      </span>
      <div className="reacts">{REACTS.map((r) => <button key={r} onClick={() => react(r)} title="Реакция">{r}</button>)}</div>
      {msg && <div className="msg" style={{ width: "100%", textAlign: "left", minHeight: 0 }}>{msg}</div>}
    </div>
  ) : null;

  if (game) {
    return (
      <Play
        ref={playRef}
        service={service}
        saved={!!user}
        active={active}
        duel={game}
        onProgress={(tries, bulls) => track({ tries, bulls })}
        onOutcome={(o) => {
          track({ done: true });
          chan.current?.send({ type: "broadcast", event: "win", payload: { from: user?.id ?? "", name: myName, tries: o.tries } satisfies WinPayload });
          onOutcome();
        }}
      >
        {strip}
      </Play>
    );
  }

  return (
    <main>
      <section className="panel">
        <div className="label">Стая</div>
        {!room ? (
          <>
            <div className="rules">
              <p>Всички в стаята получават едно и също число и се надпреварват кой пръв ще го познае. Виждате опитите си на живо.</p>
            </div>
            {!online && <div className="banner">Дуелът работи с Supabase. Попълни .env и пусни отново.</div>}
            {online && !user && <div className="banner">Влез в профила си, за да създадеш или влезеш в стая.</div>}
            <div className="joinrow">
              <button className="btn primary" onClick={() => join(makeCode())} disabled={!online || !user}>Създай стая</button>
              <input className="code-in" type="text" maxLength={4} placeholder="КОД" aria-label="Код на стая" value={codeIn}
                onChange={(e) => setCodeIn(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") join(codeIn); }} />
              <button className="btn" onClick={() => join(codeIn)} disabled={!online || !user}>Влез</button>
            </div>
            {msg && <div className="msg err" style={{ textAlign: "left" }}>{msg}</div>}
          </>
        ) : (
          <>
            <div className="label">Код за приятелите</div>
            <div className="code">{room}</div>
            <p className="help" style={{ textAlign: "center" }}>Кажи кода на приятел. Той влиза от същата страница, таб Дуел.</p>
            <div className="opts" style={{ justifyContent: "center" }}>
              <label>Цифри
                <select value={len} onChange={(e) => setLen(Number(e.target.value) as Len)}>
                  <option value={3}>3</option><option value={4}>4</option><option value={5}>5</option>
                </select>
              </label>
              <button className="btn danger" onClick={start}>⚡ Старт за всички</button>
              <button className="btn slim" onClick={leave}>Напусни</button>
            </div>
            <div className="msg">{msg}</div>
            <div className="label">Реакции</div>
            <div className="reacts">{REACTS.map((r) => <button key={r} onClick={() => react(r)}>{r}</button>)}</div>
          </>
        )}
      </section>
      <section className="panel right">
        <div className="label">В стаята</div>
        <div className="peers">
          {!room && <div className="empty">Още никой. Създай стая или влез с код.</div>}
          {room && !peers.length && <div className="empty">Свързвам се…</div>}
          {peers.map((p) => (
            <div key={p.id} className={"peer" + (p.id === user?.id ? " me" : "") + (p.done ? " done" : "")}>
              <Avatar url={p.avatar} name={p.name} />
              <span className="nm">{p.name}</span>
              <span className="st">{p.done ? `✓ ${plural(p.tries, "опит", "опита")}` : "готов"}</span>
            </div>
          ))}
        </div>
        <div className="label">Последни дуели</div>
        <div className="log">
          {!history.length && <div className="empty">Няма изиграни дуели.</div>}
          {history.map((h, i) => (
            <div key={i} className={"row" + (h.me ? " win" : "")} style={{ gridTemplateColumns: "1fr auto" }}>
              <span>{h.me ? "🏆 " : ""}{h.who} · стая {h.code}</span>
              <span className={"pill " + (h.me ? "c" : "b")}>{plural(h.tries, "опит", "опита")}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
