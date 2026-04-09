-- ============================================
-- 7. ユーザープロフィール拡張
-- ============================================
-- アカウント設定（性別・生まれ年・ポジション）をusersテーブルに追加

ALTER TABLE public.users
  ADD COLUMN gender TEXT CHECK (gender IN ('男', '女', '未設定')) NOT NULL DEFAULT '未設定',
  ADD COLUMN birth_year INT CHECK (birth_year IS NULL OR (birth_year >= 1940 AND birth_year <= 2020)),
  ADD COLUMN position TEXT DEFAULT '';

-- Auth Trigger も拡張：新規登録時に gender のデフォルト値が自動適用される（ALTER DEFAULT で十分）

-- teams テーブルにスポーツ種別・アイコン色を追加（チーム選択画面の充実化用）
ALTER TABLE public.teams
  ADD COLUMN sport_type TEXT DEFAULT '',
  ADD COLUMN icon_color TEXT DEFAULT 'indigo';
