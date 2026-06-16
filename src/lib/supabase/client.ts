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
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // navigator.locks による既定ロックを無効化する（no-op ロック）。
        //
        // supabase-js は Storage/REST のリクエストごとに _getAccessToken →
        // auth.getSession() を呼び、これが navigator.locks（lock:sb-<ref>-auth-token）
        // 配下で実行される。AuthContext の onAuthStateChange が async で
        // supabase クエリ(fetchUser)を await しており、これがロック保持中に
        // 同じロックを再取得しようとして getSession が返らなくなる。
        // すると Storage の upload はトークン取得段階で固まり、HTTP を一度も
        // 送らないまま 30 秒でタイムアウトする（Network に storage リクエストが
        // 出ないことを確認済み）。
        //
        // ロックを no-op（fn をそのまま実行）にすると直列化はなくなるが、
        // 取得・スティール・再入のいずれの経路でも固まらなくなる。単一タブ前提の
        // 本アプリではトークン更新の競合リスクは実質無視できる。
        lock: async (_name, _acquireTimeout, fn) => fn(),
      },
    }
  );
}

let browserClient: ReturnType<typeof buildClient> | undefined;

export function createClient() {
  return (browserClient ??= buildClient());
}
