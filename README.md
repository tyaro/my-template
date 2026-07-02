# Banto（番頭）

Tauri v2 + SvelteKit（Svelte 5 Runes）向けのフルスタック管理画面
フレームワーク/テンプレート。refineライクなヘッドレスコアに、独自の
データグリッド・スキーマ駆動フォーム・チャート・ドッキングレイアウトを
組み合わせる。

名称は、江戸時代の商家で主人に代わって店を切り盛りした「番頭」に由来。

- 仕様書: [docs/ui-framework-spec.md](docs/ui-framework-spec.md)
- npmスコープ: `@banto/*` / Rustクレート: `banto-*`

## 構成

```
packages/
  theme/            @banto/theme — CSS変数テーマ + ライト/ダーク/システム切替
crates/
  banto-core/       共通型（ListParams/SortState/FilterState/エラー型）とtrait
  banto-storage/    sqlxリポジトリ実装（M2で実装）
  banto-server/     組み込みaxumサーバ（M6で実装）
apps/
  admin-template/   Tauri v2 + SvelteKit 管理画面テンプレート本体
```

## 開発

前提: Node 22+ / pnpm 10+ / Rust（Tauriの[プラットフォーム別前提条件](https://tauri.app/start/prerequisites/)）

```sh
pnpm install

# ブラウザのみで開発（Tauri不要）
pnpm dev                # http://localhost:1420

# Tauriデスクトップアプリとして開発
pnpm --filter admin-template tauri dev

# 検証
pnpm check              # svelte-check + tsc
pnpm build              # SvelteKit 静的ビルド（apps/admin-template/build）
cargo check -p banto-core -p banto-storage -p banto-server
```

補足:

- Windows向け`tauri build`には`.ico`アイコンが別途必要
  （`pnpm --filter admin-template tauri icon`で`icons/icon.png`から生成可能）。
- 認証はM0時点ではスタブ（任意の入力でログイン可）。M2で`AuthProvider`に
  置き換わる。
- テーマ設定の保存先はM0ではlocalStorage。M6で`SettingsProvider`
  （ローカルSQLite設定DB）に移行する。
