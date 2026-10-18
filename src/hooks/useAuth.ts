import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
}

/** Сесия и профил от Supabase Auth. В локален режим всичко е null. */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session) {
      setProfile(null);
      return;
    }
    const u = session.user;
    const meta = (u.user_metadata ?? {}) as Record<string, string | undefined>;
    const fallback: Profile = {
      id: u.id,
      username: meta.full_name ?? meta.name ?? u.email?.split("@")[0] ?? "Играч",
      avatar_url: meta.avatar_url ?? null,
    };
    setProfile(fallback);
    supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .eq("id", u.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setProfile(data as Profile);
      });
  }, [session]);

  const signInGoogle = useCallback(
    () => supabase?.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin } }),
    [],
  );
  const signInEmail = useCallback(
    (email: string) => supabase?.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin } }),
    [],
  );
  const signOut = useCallback(() => supabase?.auth.signOut(), []);

  const user: User | null = session?.user ?? null;
  return { user, profile, ready, signInGoogle, signInEmail, signOut };
}
