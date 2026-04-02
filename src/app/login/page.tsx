"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

function LoginContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [teamName, setTeamName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    sessionStorage.setItem("invite_token", token);

    const fetchTeamName = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("invite_tokens")
        .select("team_id, teams(name)")
        .eq("token", token)
        .is("used_at", null)
        .single();
      if (data?.teams) {
        const teams = data.teams as unknown as { name: string };
        setTeamName(teams.name);
      }
    };
    fetchTeamName();
  }, [token]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const supabase = createClient();
    const redirectUrl = new URL("/auth/callback", window.location.origin);
    if (token) redirectUrl.searchParams.set("token", token);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectUrl.toString() },
    });
    if (error) {
      console.error("ログインエラー:", error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-indigo-50/50 px-4">
      <div className="w-full max-w-sm animate-page-in">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-200">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">TeamHub</h1>
          <p className="text-sm text-gray-500 mt-1">スポーツチーム管理</p>
        </div>

        {/* カード */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          {teamName && (
            <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4 text-center">
              <p className="text-sm text-indigo-700">
                <span className="font-semibold">{teamName}</span> に招待されています
              </p>
            </div>
          )}

          <Button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full h-12 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm rounded-xl font-medium transition-all"
            aria-label="Googleアカウントでログイン"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                ログイン中...
              </span>
            ) : (
              <span className="flex items-center gap-3">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Googleでログイン
              </span>
            )}
          </Button>

          <p className="text-xs text-center text-gray-400">
            ログインすることで利用規約に同意したものとみなされます
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
