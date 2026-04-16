import { createClient } from "@supabase/supabase-js";

// RLS をバイパスする管理者クライアント。Cron ジョブなど認証ユーザーが
// いないサーバーサイド処理専用。API route のリクエスト処理には使わないこと。
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
