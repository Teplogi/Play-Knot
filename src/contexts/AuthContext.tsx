"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { User, TeamRole } from "@/types";
import { hasHostPrivilege } from "@/types";
import type { User as AuthUser } from "@supabase/supabase-js";

// TODO: Supabase接続後にuseEffect版に戻す

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
  const [teamRole, setTeamRole] = useState<TeamRole | null>("host");

  // UIプレビュー用のモックユーザー
  const mockUser: User = {
    id: "mock-user-id",
    name: "テストユーザー",
    email: "test@example.com",
    gender: "未設定",
    birth_year: null,
    position: "",
    created_at: new Date().toISOString(),
  };

  const isHost = () => teamRole === "host";
  const isCoHost = () => teamRole === "co_host";
  const hasHostPriv = () => hasHostPrivilege(teamRole);
  const signOut = async () => { /* no-op for preview */ };

  return (
    <AuthContext.Provider
      value={{
        authUser: null,
        user: mockUser,
        teamRole,
        loading: false,
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
