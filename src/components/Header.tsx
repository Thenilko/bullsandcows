import { useState } from "react";
import { isOnline } from "../lib/supabase";
import { sound, sfx } from "../lib/fx";
import { Avatar } from "./Avatar";
import type { useAuth } from "../hooks/useAuth";

export type Tab = "play" | "duel" | "solve" | "board";
export const TABS: { id: Tab; label: string }[] = [
  { id: "play", label: "Играя" },
  { id: "duel", label: "Дуел" },
  { id: "solve", label: "Компютърът" },
  { id: "board", label: "Класиране" },
];

interface Props {
  tab: Tab;
  onTab: (t: Tab) => void;
  auth: ReturnType<typeof useAuth>;
}

export function Header({ tab, onTab, auth }: Props) {
  const [snd, setSnd] = useState(sound.on);
  const [email, setEmail] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [sent, setSent] = useState(false);

  const toggleSound = () => {
    const on = sound.toggle();
    setSnd(on);
    if (on) sfx.key();
  };

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    await auth.signInEmail(email);
    setSent(true);
  };

  return (
    <header>
      <div>
        <h1>
          <span className="b">Бикове</span>
          <span className="i">и</span>
          <span className="c">крави</span>
        </h1>
        <p className="tagline">
          <b className="b">🐂 Бик</b> е цифра на вярното място. <b className="c">🐄 Крава</b> е вярна цифра на грешно място.
        </p>
      </div>
      <div className="topbar">
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => onTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        {!isOnline && (
          <div className="who guest" title="Добави VITE_SUPABASE_URL и ключ в .env, за да включиш вход, класиране и дуел">
            <span>Локален режим</span>
          </div>
        )}
        {isOnline && auth.ready && !auth.user && !emailOpen && (
          <div className="who guest">
            <button className="btn slim" onClick={() => auth.signInGoogle()}>Вход с Google</button>
            <button className="btn slim" onClick={() => setEmailOpen(true)}>Имейл</button>
          </div>
        )}
        {isOnline && !auth.user && emailOpen && (
          <form className="joinrow" onSubmit={sendLink}>
            {sent ? (
              <span className="help">Провери пощата си за линк за вход.</span>
            ) : (
              <>
                <input type="email" placeholder="ти@пример.бг" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Имейл" />
                <button className="btn slim primary" type="submit">Изпрати линк</button>
              </>
            )}
            <button className="btn slim" type="button" onClick={() => { setEmailOpen(false); setSent(false); }}>✕</button>
          </form>
        )}
        {isOnline && auth.user && (
          <div className="who">
            <Avatar url={auth.profile?.avatar_url} name={auth.profile?.username ?? "ти"} size={30} />
            <span>{auth.profile?.username ?? "ти"}</span>
            <button className="btn slim" onClick={() => auth.signOut()} title="Изход">Изход</button>
          </div>
        )}
        <button className="icon-btn" onClick={toggleSound} title="Звук">{snd ? "🔊" : "🔇"}</button>
      </div>
    </header>
  );
}
