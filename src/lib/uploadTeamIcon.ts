import { createClient } from "@/lib/supabase/client";

/**
 * チームアイコン画像のアップロード処理（ブラウザ専用）。
 *
 * - 画像を中央正方形にクロップし 512px の PNG にリサイズしてからアップロードする
 *   （巨大な元画像をそのまま保存しないため。カメラ写真は数 MB あるので必須）。
 * - 保存先は team-icons/{teamId}/icon_{timestamp}.png。
 *   ファイル名を毎回変えることで CDN キャッシュによる古い画像表示を避ける。
 * - アップロード後、同チームの古いアイコンファイルはベストエフォートで削除する。
 *
 * 認可は Storage の RLS（is_team_host）で担保される。host/co_host 以外は
 * upload が拒否される。
 */

const BUCKET = "team-icons";
const SIZE = 512;

async function resizeToSquarePng(file: File, size = SIZE): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d context を取得できませんでした");
    // 中央を正方形にクロップ
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("画像の変換に失敗しました"))),
        "image/png",
      ),
    );
  } finally {
    bitmap.close();
  }
}

/** 画像をアップロードして公開 URL を返す */
export async function uploadTeamIcon(teamId: string, file: File): Promise<string> {
  const blob = await resizeToSquarePng(file);
  const supabase = createClient();

  const fileName = `icon_${Date.now()}.png`;
  const path = `${teamId}/${fileName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: "image/png",
    upsert: true,
  });
  if (error) throw error;

  // 古いアイコンを掃除（失敗しても致命的ではないので握りつぶす）
  try {
    const { data: existing } = await supabase.storage.from(BUCKET).list(teamId);
    const stale = (existing ?? [])
      .filter((f) => f.name !== fileName)
      .map((f) => `${teamId}/${f.name}`);
    if (stale.length > 0) {
      await supabase.storage.from(BUCKET).remove(stale);
    }
  } catch {
    /* noop */
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
