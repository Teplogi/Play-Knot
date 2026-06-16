import { createBrowserClient } from "@supabase/ssr";

// ブラウザ用Supabaseクライアント（シングルトン）
//
// createBrowserClient を呼ぶたびに新しい GoTrueClient が作られると、ブラウザ内に
// 複数インスタンスが共存し navigator.locks（lock:sb-<ref>-auth-token）の取り合いで
// getSession がデッドロックする。すると Storage の upload はアクセストークン取得の
// 段階で固まり、全端末・毎回 30 秒でタイムアウトする。
// アプリ全体で 1 インスタンスを使い回すことでこれを防ぐ。
function buildClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

let browserClient: ReturnType<typeof buildClient> | undefined;

export function createClient() {
  return (browserClient ??= buildClient());
}
