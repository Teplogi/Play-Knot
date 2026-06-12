-- 025_team_icon_image.sql
-- チームアイコンの画像アップロード対応
--
-- 従来は teams.icon_color（頭文字 + 色）のみだったが、ホスト/共同ホストが
-- 任意の画像をアイコンに設定できるようにする。icon_url が NULL のときは
-- 従来どおり頭文字アイコンを表示する（デフォルト挙動は不変）。

-- 1) teams にアイコン画像 URL カラムを追加
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- 2) アイコン画像用のストレージバケット（公開読み取り）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-icons',
  'team-icons',
  true,
  5242880, -- 5MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3) ストレージ RLS ポリシー
--    パス規約: team-icons/{teamId}/xxxx.png
--    - 読み取り: 公開（バケット public + 明示ポリシー）
--    - 追加/更新/削除: 当該チームの host / co_host のみ
--      （public.is_team_host は 012_rls_security_definer.sql で定義済み）

DROP POLICY IF EXISTS "team_icons_read" ON storage.objects;
CREATE POLICY "team_icons_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'team-icons');

DROP POLICY IF EXISTS "team_icons_insert" ON storage.objects;
CREATE POLICY "team_icons_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'team-icons'
    AND public.is_team_host(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "team_icons_update" ON storage.objects;
CREATE POLICY "team_icons_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'team-icons'
    AND public.is_team_host(((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'team-icons'
    AND public.is_team_host(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "team_icons_delete" ON storage.objects;
CREATE POLICY "team_icons_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'team-icons'
    AND public.is_team_host(((storage.foldername(name))[1])::uuid)
  );
