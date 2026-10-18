<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 実装はサブエージェント worker（Composer 2.5）に任せる

アプリのコード変更は、親エージェントが直接編集せず、Cursor の **Task** で起動した **サブエージェント worker** に渡す。

### worker に任せる範囲

- 機能追加、不具合修正、リファクタ
- `src/` 配下の変更
- アプリ設定（`next.config.*`、`package.json` の依存追加など）で挙動に影響する変更

### Task の指定（固定）

| 項目 | 値 |
|------|-----|
| ツール | Task |
| `subagent_type` | `generalPurpose` |
| `model` | `composer-2.5-fast`（**Composer 2.5**。一覧にこの名前があるときだけ使う。別モデルに置き換えない） |
| 実行場所 | ローカル（ユーザーがクラウド実行を明示したときだけ cloud） |

### worker へのプロンプトに含めること

worker は親の会話履歴を見ない。次を必ず書く。

1. **目的**（ユーザーが何を得たいか）
2. **触るファイル**（パスを列挙。触らないファイルも書く）
3. **期待する動作**（完了条件・UI・API の振る舞い）
4. **禁止事項**（スコープ外、秘密情報、wip データの削除など）

### 親エージェントの役割

- 要件の整理、調査、方針の説明
- worker が返した差分の **レビュー** と **動作確認**（必要ならブラウザ）
- ユーザーが依頼したときの **git commit / push**
- **AGENTS.md** や **`.cursor/rules/`** の更新、環境セットアップの確認

質問への回答だけのタスクでは worker を起動しない。

## Development

Install dependencies with `npm ci`, then start the app with `npm run dev` (port 3000). No secrets are required for local development.

Shared shift data is stored in `data/shared-state.json` unless both `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are set. Login uses `ACCESS_PASSWORD` when it is set; otherwise the issued password in `src/lib/auth/session.ts` is accepted. The Supabase variables in `.env.example` are unused by the current login.

`next-env.d.ts` is gitignored and written by `next dev` or `next build`. Run one of those before `npx tsc --noEmit`. `npm run build` is the TypeScript check this project runs.
