import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { TeamRole } from "@/types";

/**
 * 現在ログイン中のユーザを取得（1リクエスト内で重複排除）。
 * Supabase の getUser() は毎回ネットワーク往復するため、
 * layout と page で重複呼び出しされないよう cache() でラップしている。
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

/**
 * 認証必須箇所で使う。未ログインなら /login へリダイレクト。
 */
export const requireUser = cache(async () => {
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
