import { useMemo, useState } from "react";
import { Header, type Tab } from "./components/Header";
import { Play } from "./components/Play";
import { Solver } from "./components/Solver";
import { Duel } from "./components/Duel";
import { Leaderboard } from "./components/Leaderboard";
import { useAuth } from "./hooks/useAuth";
import { LocalService, service } from "./game/service";

function storedTab(): Tab {
  try {
    const t = localStorage.getItem("bk-tab");
    if (t === "play" || t === "duel" || t === "solve" || t === "board") return t;
  } catch { /* ignore */ }
  return "play";
}

export default function App() {
  const auth = useAuth();
  const [tab, setTabState] = useState<Tab>(storedTab);
  const [refreshKey, setRefreshKey] = useState(0);
  const setTab = (t: Tab) => { setTabState(t); try { localStorage.setItem("bk-tab", t); } catch { /* ignore */ } };

  // Онлайн без вход: гостът играе локално и резултатът не се записва.
  const guest = service.mode === "online" && !auth.user;
  const svc = useMemo(() => (guest ? new LocalService() : service), [guest]);
  const saved = service.mode === "online" && !!auth.user;

  return (
    <>
      <div className="blob a" /><div className="blob b" />
      <div className="wrap">
        <Header tab={tab} onTab={setTab} auth={auth} />
        <div hidden={tab !== "play"}>
          {guest && auth.ready && <div className="banner" style={{ marginBottom: 18 }}>Играеш като гост. Влез с Google или имейл, за да влизаш в класирането и да играеш дуели.</div>}
          <Play key={auth.user?.id ?? "local"} service={svc} saved={saved} active={tab === "play"} onOutcome={() => setRefreshKey((k) => k + 1)} />
        </div>
        <div hidden={tab !== "duel"}>
          <Duel user={auth.user} profile={auth.profile} active={tab === "duel"} onOutcome={() => setRefreshKey((k) => k + 1)} />
        </div>
        <div hidden={tab !== "solve"}><Solver /></div>
        {tab === "board" && <Leaderboard userId={auth.user?.id ?? null} refreshKey={refreshKey} />}
      </div>
    </>
  );
}
