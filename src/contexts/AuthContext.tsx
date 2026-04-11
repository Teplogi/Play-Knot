"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User, TeamRole } from "@/types";
import { hasHostPrivilege } from "@/types";
import type { User as AuthUser } from "@supabase/supabase-js";

type AuthContextType = {
  authUser: AuthUser | null;
  user: User | null;
  teamRole: TeamRole | null;
  loading: boolean;
  isHost: () => boolean;
  isCoHost: () => boolean;
  hasHostPrivilege: () => boolean;
  setTeamRole: (role: TeamRole | null) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [teamRole, setTeamRole] = useState<TeamRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // 現在のセッションを取得
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setAuthUser(session.user);
        await fetchUser(session.user.id);
      }
      setLoading(false);
    };

    // ユーザー情報を取得
    const fetchUser = async (userId: string) => {
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();
      if (data) {
        setUser(data as User);
      }
    };

    getSession();

    // 認証状態の変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setAuthUser(session.user);
          await fetchUser(session.user.id);
        } else {
          setAuthUser(null);
          setUser(null);
          setTeamRole(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const isHost = () => teamRole === "host";
  const isCoHost = () => teamRole === "co_host";
  const hasHostPriv = () => hasHostPrivilege(teamRole);

  const signOut = async () => {
    // 1. サーバ側の httpOnly cookie をクリア（これが無いと
    //    middleware の getUser() が通って /login → /teams に弾かれる）
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } catch {
      // ネットワークエラーは無視。クライアント側だけでも消して進める
    }
    // 2. クライアント側のローカルセッションもクリア
    try {
      const supabase = createClient();
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* noop */
    }
    // 3. ページ全体をリロードして再描画
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        authUser,
        user,
        teamRole,
        loading,
        isHost,
        isCoHost,
        hasHostPrivilege: hasHostPriv,
        setTeamRole,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthはAuthProvider内で使用してください");
  }
  return context;
}
