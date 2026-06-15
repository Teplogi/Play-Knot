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
 *
 * デコードは createImageBitmap ではなく <img> + object URL を使う。
 * createImageBitmap は端末・画像形式（iPhone の HEIC 等）によって resolve も
 * reject もせずハングすることがあり、「アップロードが終わらない」原因になるため。
 * <img> 方式は Safari の HEIC デコードや EXIF 回転にも追従する。
 * さらに各非同期処理にタイムアウトを設け、万一固まっても必ず失敗で終わらせる。
 */

const BUCKET = "team-icons";
const SIZE = 512;
const DECODE_TIMEOUT_MS = 20_000;
const UPLOAD_TIMEOUT_MS = 30_000;

/** Promise にタイムアウトを付ける（ハングを必ずエラーに変える） */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label}がタイムアウトしました（${Math.round(ms / 1000)}秒）`)),
      ms,
    );
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/** File を <img> 経由でデコードする（object URL を使い、終わったら解放） */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像を読み込めませんでした（対応していない形式の可能性があります）"));
    };
    img.src = url;
  });
}

async function resizeToSquarePng(file: File, size = SIZE): Promise<Blob> {
  const img = await withTimeout(loadImage(file), DECODE_TIMEOUT_MS, "画像の読み込み");
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) throw new Error("画像サイズを取得できませんでした");

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context を取得できませんでした");

  // 中央を正方形にクロップ
  const side = Math.min(w, h);
  const sx = (w - side) / 2;
  const sy = (h - side) / 2;
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("画像の変換に失敗しました"))),
      "image/png",
    ),
  );
}

/** 画像をアップロードして公開 URL を返す */
export async function uploadTeamIcon(teamId: string, file: File): Promise<string> {
  const blob = await resizeToSquarePng(file);
  const supabase = createClient();

  const fileName = `icon_${Date.now()}.png`;
  const path = `${teamId}/${fileName}`;

  const { error } = await withTimeout(
    supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: "image/png",
      upsert: true,
    }),
    UPLOAD_TIMEOUT_MS,
    "アップロード",
  );
  if (error) throw error;

  // 古いアイコンを掃除（失敗しても致命的ではないので握りつぶす）
  try {
    const { data: existing } = await withTimeout(
      supabase.storage.from(BUCKET).list(teamId),
      UPLOAD_TIMEOUT_MS,
      "アイコン一覧の取得",
    );
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
