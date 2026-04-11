import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { TeamRole } from "@/types";

export type CurrentUser = { id: string; email?: string };

/**
 * 現在ログイン中のユーザを取得（1リクエスト内で重複排除）。
 *
 * middleware (proxy.ts) が supabase.auth.getUser() で cookie を検証して
 * いるため、ここでは getClaims() で JWT を読むだけ。getClaims() は
 * 非対称署名鍵ならローカル検証で完結しネットワーク往復ゼロ、対称鍵でも
 * 1リクエスト 1 回だけ。これにより以前 getUser() を多重呼びして
 * over_request_rate_limit に当たっていた問題を解消する。
 *
 * server components で getSession().user を使うと「insecure」警告が
 * 出るためそちらは使わない。
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return null;
  return {
    id: data.claims.sub as string,
    email: typeof data.claims.email === "string" ? data.claims.email : undefined,
  };
});

/**
 * 認証必須箇所で使う。未ログインなら /login へリダイレクト。
 */
export const requireUser = cache(async (): Promise<CurrentUser> => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
});

/**
 * 現在ユーザの該当チームでの role を取得（1リクエスト内で重複排除）。
 */
export const getTeamMembership = cache(async (teamId: string) => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();
  return data ? { role: data.role as TeamRole } : null;
});
