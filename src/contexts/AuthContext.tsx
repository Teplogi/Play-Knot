"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types";
import type { User as AuthUser } from "@supabase/supabase-js";

type AuthContextType = {
  authUser: AuthUser | null;
  user: User | null;
  teamRole: "host" | "guest" | null;
  loading: boolean;
  isHost: () => boolean;
  setTeamRole: (role: "host" | "guest" | null) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [teamRole, setTeamRole] = useState<"host" | "guest" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // 初期セッション取得
    const initSession = async () => {
      const { data: { user: currentAuthUser } } = await supabase.auth.getUser();
      setAuthUser(currentAuthUser);

      if (currentAuthUser) {
        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("id", currentAuthUser.id)
          .single();
        setUser(userData);
      }

      setLoading(false);
    };

    initSession();

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentAuthUser = session?.user ?? null;
        setAuthUser(currentAuthUser);

        if (currentAuthUser) {
          const { data: userData } = await supabase
            .from("users")
            .select("*")
            .eq("id", currentAuthUser.id)
            .single();
          setUser(userData);
        } else {
          setUser(null);
          setTeamRole(null);
        }

        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const isHost = () => teamRole === "host";

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setAuthUser(null);
    setUser(null);
    setTeamRole(null);
  };

  return (
    <AuthContext.Provider
      value={{ authUser, user, teamRole, loading, isHost, setTeamRole, signOut }}
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
