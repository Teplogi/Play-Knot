"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

function InviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "invalid" | "joining" | "login_required">(() =>
    token ? "loading" : "invalid"
  );
  const [teamName, setTeamName] = useState("");

  useEffect(() => {
    if (!token) return;
    const processInvite = async () => {
      const supabase = createClient();
      const { data: inviteToken } = await supabase
        .from("invite_tokens")
        .select("*, teams(name)")
        .eq("token", token)
        .is("used_at", null)
        .single();
      if (!inviteToken || new Date(inviteToken.expires_at) < new Date()) { setStatus("invalid"); return; }
      const teams = inviteToken.teams as unknown as { name: string };
      setTeamName(teams?.name ?? "");
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setStatus("joining");
        const res = await fetch("/api/invite/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
        if (res.ok) { const { teamId } = await res.json(); router.push(`/teams/${teamId}`); } else { setStatus("invalid"); }
      } else {
        sessionStorage.setItem("invite_token", token);
        setStatus("login_required");
      }
    };
    processInvite();
  }, [token, router]);

  if (status === "loading" || status === "joining") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500 text-sm">{status === "joining" ? "チームに参加中..." : "招待を確認中..."}</p>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center animate-page-in">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
          </div>
          <h2 className="font-bold text-gray-900 mb-2">招待リンクが無効です</h2>
          <p className="text-gray-500 text-sm mb-4">このリンクは期限切れか、既に使用されています。</p>
          <Button onClick={() => router.push("/login")} className="rounded-xl bg-indigo-600 hover:bg-indigo-700">ログイン画面へ</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-indigo-50/50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center animate-page-in">
        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
        </div>
        <h2 className="font-bold text-gray-900 mb-1">チームへの招待</h2>
        {teamName && (
          <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3 mt-3 mb-4">
            <p className="text-sm text-indigo-700"><span className="font-semibold">{teamName}</span> に招待されています</p>
          </div>
        )}
        <p className="text-gray-500 text-sm mb-4">参加するにはログインが必要です。</p>
        <Button onClick={() => router.push(`/login?token=${token}`)} className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold" aria-label="Googleでログインして参加">
          Googleでログインして参加
        </Button>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full" /></div>}>
      <InviteContent />
    </Suspense>
  );
}
