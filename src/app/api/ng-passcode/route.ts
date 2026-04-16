import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHash, randomBytes } from "crypto";
import { sendEmail } from "@/lib/email/resend";
import { pinResetTemplate } from "@/lib/email/templates";

function hashPin(pin: string): string {
  return createHash("sha256").update(pin).digest("hex");
}

// GET: PIN 設定済みかチェック
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    if (!teamId) return NextResponse.json({ error: "teamIdが必要です" }, { status: 400 });

    const { data } = await supabase
      .from("ng_passcodes")
      .select("id")
      .eq("user_id", user.id)
      .eq("team_id", teamId)
      .single();

    return NextResponse.json({ hasPin: !!data });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// POST: PIN 設定 / 検証 / リセット要求
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

    const body = await request.json();
    const { teamId, action } = body;
    if (!teamId) return NextResponse.json({ error: "teamIdが必要です" }, { status: 400 });

    // ホスト/共同ホスト確認
    const { data: member } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();
    if (!member || !["host", "co_host"].includes(member.role)) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    if (action === "setup") {
      return handleSetup(supabase, user.id, teamId, body.pin);
    } else if (action === "verify") {
      return handleVerify(supabase, user.id, teamId, body.pin);
    } else if (action === "reset-request") {
      return handleResetRequest(supabase, user.id, teamId);
    } else if (action === "reset-confirm") {
      return handleResetConfirm(supabase, user.id, teamId, body.token, body.pin);
    }

    return NextResponse.json({ error: "不正なアクションです" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// PIN 初期設定
async function handleSetup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  teamId: string,
  pin: string
) {
  if (!pin || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "4桁の数字を入力してください" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("ng_passcodes")
    .select("id")
    .eq("user_id", userId)
    .eq("team_id", teamId)
    .single();

  if (existing) {
    return NextResponse.json({ error: "PINは既に設定されています" }, { status: 409 });
  }

  const { error } = await supabase
    .from("ng_passcodes")
    .insert({
      user_id: userId,
      team_id: teamId,
      hashed_pin: hashPin(pin),
    });

  if (error) {
    return NextResponse.json({ error: "PINの設定に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// PIN 検証
async function handleVerify(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  teamId: string,
  pin: string
) {
  if (!pin || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "4桁の数字を入力してください" }, { status: 400 });
  }

  const { data } = await supabase
    .from("ng_passcodes")
    .select("hashed_pin")
    .eq("user_id", userId)
    .eq("team_id", teamId)
    .single();

  if (!data) {
    return NextResponse.json({ error: "PINが設定されていません" }, { status: 404 });
  }

  if (data.hashed_pin !== hashPin(pin)) {
    return NextResponse.json({ error: "PINが正しくありません" }, { status: 401 });
  }

  return NextResponse.json({ verified: true });
}

// リセット要求 → メール送信
async function handleResetRequest(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  teamId: string
) {
  const { data: userRow } = await supabase
    .from("users")
    .select("email, notification_email")
    .eq("id", userId)
    .single();
  if (!userRow) {
    return NextResponse.json({ error: "ユーザー情報が見つかりません" }, { status: 404 });
  }

  const { data: teamRow } = await supabase
    .from("teams")
    .select("name")
    .eq("id", teamId)
    .single();

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30分

  const { error } = await supabase
    .from("ng_passcodes")
    .update({
      reset_token: token,
      reset_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("team_id", teamId);

  if (error) {
    return NextResponse.json({ error: "リセットトークンの保存に失敗しました" }, { status: 500 });
  }

  const addr = userRow.notification_email || userRow.email;
  const { subject, html } = pinResetTemplate({
    teamName: teamRow?.name || "チーム",
    teamId,
    token,
  });
  await sendEmail({ to: addr, subject, html });

  return NextResponse.json({ sent: true });
}

// リセット確認 (トークン検証 + 新 PIN 設定)
async function handleResetConfirm(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  teamId: string,
  token: string,
  pin: string
) {
  if (!token) {
    return NextResponse.json({ error: "トークンが必要です" }, { status: 400 });
  }
  if (!pin || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "4桁の数字を入力してください" }, { status: 400 });
  }

  const { data } = await supabase
    .from("ng_passcodes")
    .select("reset_token, reset_expires_at")
    .eq("user_id", userId)
    .eq("team_id", teamId)
    .single();

  if (!data || data.reset_token !== token) {
    return NextResponse.json({ error: "無効なリセットトークンです" }, { status: 400 });
  }

  if (!data.reset_expires_at || new Date() > new Date(data.reset_expires_at)) {
    return NextResponse.json({ error: "リセットトークンの有効期限が切れています" }, { status: 400 });
  }

  const { error } = await supabase
    .from("ng_passcodes")
    .update({
      hashed_pin: hashPin(pin),
      reset_token: null,
      reset_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("team_id", teamId);

  if (error) {
    return NextResponse.json({ error: "PINの再設定に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
