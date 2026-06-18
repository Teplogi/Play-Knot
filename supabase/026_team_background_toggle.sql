-- 026_team_background_toggle.sql
-- 背景写真の表示 ON/OFF
--
-- これまではスポーツ種別 (teams.sport_type) に応じた背景写真を常に表示していたが、
-- ホスト/共同ホストが「背景なし（白背景）」を選べるようにする。
--   - background_enabled = TRUE  : 従来どおり種目別の背景写真を表示
--   - background_enabled = FALSE : 背景写真を出さず白背景にする
--
-- 既存チームは従来挙動を維持するため DEFAULT TRUE。
-- なお「その他（自由入力）」の種目を選んだ場合は、UI 側でデフォルトを
-- FALSE（背景なし）に倒す。カラムとしてはあくまで TRUE/FALSE の保存先。

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS background_enabled BOOLEAN NOT NULL DEFAULT TRUE;
