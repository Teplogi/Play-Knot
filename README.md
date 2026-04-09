# Play Knot

スポーツチームの出欠管理からチーム分けまでワンストップで。

## 主な機能

- **チーム管理** — チーム作成・招待リンクでのメンバー追加・ロール管理（ホスト / 共同ホスト / ゲスト）
- **練習日程** — 日程の作成・編集・リスト / カレンダー切替表示
- **出欠管理** — 参加 / 不参加の回答・定員管理・当日キャンセル検知
- **チーム分け** — ランダム / 男女均等の振り分け・NGペア考慮・ドラッグ&ドロップで手動調整
- **出席統計** — メンバーごとの出席率・当日キャンセル回数の可視化
- **通知** — 日程追加・変更・リマインド・当日キャンセル時のメール通知
- **アカウント設定** — 表示名・性別・ポジション・日程のデフォルト表示

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS v4 + shadcn/ui |
| バックエンド | Supabase (Auth / Database / RLS) |
| メール通知 | Resend |
| ホスティング | Vercel |
| D&D | @dnd-kit |

## セットアップ

### 1. インストール

```bash
npm install
```

### 2. 環境変数

`.env.local` を作成:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

RESEND_API_KEY=<resend-api-key>
NOTIFICATION_FROM_EMAIL=noreply@yourdomain.com

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. データベース

Supabase の SQL Editor で、`supabase/` ディレクトリ内のマイグレーションを順番に実行:

```
001_create_tables.sql
002_enable_rls.sql
003_auth_trigger.sql
004_invite_tokens.sql
005_add_co_host_role.sql
006_notification_preferences.sql
007_user_profile_columns.sql
```

### 4. 起動

```bash
npm run dev
```

http://localhost:3000 で開きます。

## ディレクトリ構成

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # API Routes
│   ├── login/              # ログインページ
│   └── teams/              # チーム関連ページ
│       └── [teamId]/
│           ├── schedules/  # 練習日程
│           ├── members/    # メンバー管理
│           ├── divide/     # チーム分け
│           ├── attendance/ # 出席統計
│           ├── ng-list/    # NGペア
│           └── settings/   # 設定
├── components/             # UIコンポーネント
│   ├── brand/              # ロゴ
│   ├── attendance/         # 出欠関連
│   ├── schedule/           # 日程関連
│   ├── divide/             # チーム分け関連
│   ├── members/            # メンバー関連
│   ├── layout/             # ナビゲーション
│   └── ui/                 # shadcn/ui
├── contexts/               # React Context (認証)
├── lib/                    # ユーティリティ
│   ├── supabase/           # Supabase クライアント
│   ├── attendance/         # 出席統計ロジック
│   ├── divide/             # チーム分けアルゴリズム
│   └── email/              # メールテンプレート
├── types/                  # 型定義
└── supabase/               # DBマイグレーション (001-007)
```

## ライセンス

Private
