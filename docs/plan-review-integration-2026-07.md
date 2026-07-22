# 改善計画の外部レビュー統合（ChatGPT、2026-07-22）

作成日: 2026-07-22
トラック: 保守者向け（トラックA）
位置づけ: [adoption-review-2026-07.md](adoption-review-2026-07.md) / [adoption-plan-2026-07.md](adoption-plan-2026-07.md)
（採用者視点レビューと計画）に対して ChatGPT が実施した**計画レビュー**の所見を、
[improvement-plan-2026-07.md §6](improvement-plan-2026-07.md) の統合作法（合意点・相違点・
採否）に倣って仕分け・統合した記録。ChatGPT の具体指摘（意味的ドリフト）は**実コードで
全件検証**した上で採否を決めた。派生する機械検査項目は
[maintainability-review-2026-07.md](maintainability-review-2026-07.md)（CR 系）へ、
採用導線項目は adoption-plan（AD 系）へ接続する。

---

## 1. 事実確認（ChatGPT の具体指摘は 7/7 CONFIRMED）

| # | 指摘 | 検証結果（一次情報） | 種別 |
| --- | --- | --- | --- |
| 1 | `audit_config_get` の経路間ロール不一致 | **本物**。Tauri=`require_role(Role::Viewer)`（`src-tauri/src/lib.rs` `audit_config_get`）/ REST=`RoleGuard{ min: Role::Admin }`（`core/src/rest/audit.rs` `audit_router`） | **conventions §1 違反・要修正** |
| 2 | README.en 12種 vs 実装14種 | 実装は `packages/charts/src/*.svelte` 14種。`README.en.md` の "12 types" が古い（`README.md` は14で正） | docドリフト |
| 3 | scan-wedge のデモ配線の記述矛盾 | `README.md` 主機能節「いずれも削除可能なデモ配線付き」（report/attachments/scan-wedge を含む）vs scan-wedge 節「テンプレート本体には一切配線していない」 | docドリフト |
| 4 | AGENTS の `pnpm check` 説明 | `AGENTS.md` は「lint/型/build」だが実体は各パッケージ `tsc --noEmit`/`svelte-check`＝**型検査のみ**（lint は `pnpm lint`、build は `pnpm build` が別） | docドリフト（AI 影響大） |
| 5 | `v0.1.1` タグ vs マニフェスト`0.1.0` | リモートに `v0.1.0`・**`v0.1.1` 両方存在**、全マニフェストは `0.1.0`（root `package.json` は private の `0.0.0`）。**私の AD-3「タグ0件」は誤り** | バージョン/工程ドリフト |
| 6 | Tauri CSP 無効 | `apps/admin-template/src-tauri/tauri.conf.json` `security.csp = null` | 多層防御の穴 |
| 7 | scan-wedge が svelte-check（svelteファイル0） | `packages/scan-wedge` に `.svelte` 0件だが `check` は `svelte-check` | ツール整合 |

**#1 が最重要**: CR-1（rule 8）が「両経路に存在するか」までで「ロール床の一致」を見ない、と
maintainability-review §1 が**自認していたギャップの実例**が実在した。

## 2. 合意点・こちらの自己修正（ChatGPT が正しく補正）

- **「AI協働 ★★★★★」は楽観的すぎた** → 検証済みドリフト（#1 のロール不一致、#2〜#5 の
  doc 不整合）が「機械検査は存在に強いが意味の一致は保証しない」ことの実例。ChatGPT の
  **8.6/10** が公正。adoption-review §3.1 に自己修正注記を追加する。
- **AD-3 の前提が誤り** → タグは0件ではなく `v0.1.0`/`v0.1.1` 存在。真の課題は「タグはあるが
  GitHub Release なし・マニフェスト未bump・CHANGELOG 未切り出し」＝**リリース工程が中途半端**。
  AD-3 を「タグを打つ」から「工程を通し切る + バージョン整合」に修正する。
- **第三者オンボーディングの摩擦** → ChatGPT の「最初の業務リソース追加から急に難しくなる」
  「9段階 vs『3ファイル』の落差」は採用レビュー（コピー面積・儀式）と**独立に一致**。
  「両レビュー一致は強い根拠」（improvement-plan §1.3）に照らし AD-5 を昇格する。

## 3. 相違点（吟味した結果、ChatGPT と方針を変える所）

- **「CR-5 を再開」より「機械検査に寄せる」**: ChatGPT は 7件を「意味的ドリフト→CR-5（テスト
  固定）」と一括りにするが、remedy は2種類。#1（コードのロール非対称）は**一度きりのテスト
  より rule 8 拡張（ロール床照合）**が筋（クラス全体を捕捉、maintainability-review の
  「散文→落ちる検査」哲学と一致）。#2〜#5（docドリフト）は**doc整合の機械検査**（rule 7 と
  同型）+ 単発修正。→ CR-6（rule 8 ロール床）/ CR-7（バージョン整合）として機械化する（§5）。
- **配布は「完成」ではなく「レシピ化 + 実需ドリブン」**: テンプレートは採用者の代わりに
  **コード署名できない**（各社が自社証明書で署名）。P3 は「署名/リリースの**レシピ + ワーク
  フロー提供**」が正しいスコープ。順序は ChatGPT も P3 を最後に置き**一致**、フレーミングだけ
  整流する。Updater の意図的保留（roadmap）も尊重。
- **CSP は「やる、ただし今 XSS 穴がある訳ではない」**: `{@html}` 厳格エスケープ（conventions §7）
  + LAN サーバのセキュリティヘッダが既にあり defense-in-depth。安いので P0 に置くのは賛成、
  深刻度の表現のみ正確化。

## 4. P0 — 信頼性の小穴を閉じる（① より先に着手、PR を3本に分割）

オーナー決定（2026-07-22）: **P0 を [i18n-plan](i18n-plan.md) レイヤ① より先に着手**。ただし
関心を混ぜないため**3つの PR に分割**する。

### PR-A: 両経路ロール整合（#1）+ ロール床の機械検査（CR-6）

- **#1 の修正方向 = Tauri 側を Admin に揃える**（オーナー決定）。根拠: REST ルーター
  （`audit_router`）・REST テスト（`rest/tests.rs`）・ルート表 doc（`rest/mod.rs`）・UI 表示条件が
  **多数 Admin を仕様として示している**ため、REST を正とし Tauri を合わせる。具体変更:
  `src-tauri/src/lib.rs` の `audit_config_get` を `require_role(Role::Viewer,…)` →
  `require_role(Role::Admin,…)` にし、doc コメント（「Any authenticated role may read this」）を
  Admin 限定へ訂正。`auth_config_get` 等の他の config-GET も同クラスの非対称がないか併せて点検。
- **CR-6（rule 8 拡張）**: 設計は §5.1。マニフェストに期待ロールを宣言し REST/Tauri 双方の
  実装ロール床を照合する。PR-A は #1 の是正と CR-6 をセットにし、**同じ非対称が二度と静かに
  入らない**状態にする。
- **受け入れ条件**: `cargo test`（両経路の audit config が Admin で成功・非 Admin で denied）緑。
  `pnpm verify:architecture` の新ロール床照合が緑。ネガティブテスト（片側のロールをずらす）で赤。

### PR-B: doc/tool 整合（#2〜#5, #7）+ バージョン整合検査（CR-7）

- **#2** README.en を14種に更新、**#3** scan-wedge の「デモ配線付き」記述を「本体未配線・
  レシピ提供」に訂正、**#4** AGENTS の `pnpm check` 説明を「型検査（svelte-check/tsc）。lint は
  `pnpm lint`、build は `pnpm build`」へ訂正、**#5** バージョンドリフトの是正（§5.2 の方針で
  マニフェストとタグ運用を整合）、**#7** `packages/scan-wedge` の `check` を `tsc --noEmit` へ
  （svelte ファイルが無く svelte-check は不要）。
- **CR-7（バージョン整合検査）**: 設計は §5.2。
- **受け入れ条件**: 上記 doc が実装と一致、`pnpm verify:architecture`（新バージョン整合）緑、
  `pnpm check`（scan-wedge が tsc 化後も）緑。

### PR-C: Tauri CSP（#6）

- `tauri.conf.json` の `security.csp` を、現アプリの実 UI（自前フロント + 生成 SVG QR 等）に
  合わせて設定する（`null` を廃する）。
- **受け入れ条件（オーナー決定）**: 設定変更だけでなく **Tauri 実動スモークまで含める** —
  CSP が実ウィンドウで UI・invoke・QR 表示等を壊さないことを、`tauri-check.yml` 相当または
  実起動スモークで確認してから受け入れる（誤った CSP は WebView を静かに壊すため）。

## 5. 機械検査の追加設計（maintainability-review の CR 系へ接続）

maintainability-review §4.1 は機械検査を「CR-1/CR-2 で打ち止め、覆すのは**実際の退行が
観測されたとき**」としていた。**#1 はその退行の実例**なので、同節の条件どおり2件だけ再開する。

### 5.1 CR-6: rule 8 にロール床照合を追加（オーナー指定の形）

- **形**: `verify-architecture.mjs` の `DUAL_PATH` マニフェストの各対に**期待ロール（床）を
  宣言**し、REST 実装（`RoleGuard{ min: Role::X }` / `require_role_at_least`）と Tauri 実装
  （`require_role(Role::X, …)`）の**双方**を静的抽出して、宣言と両実装が一致するか照合する。
- **捕捉する退行**: 片側のロールを変える/宣言と実装がずれる（＝#1 のクラス）。
- **制約**: `src-tauri` はサンドボックスでコンパイル不可のため**静的テキスト解析**に留める
  （CR-1 と同じ方針）。抽出が曖昧な対は許可リストで明示。
- **conventions §1 への反映**: 「mutating の両経路存在」に加え「**ロール床の一致も機械検査**」
  へ注記を更新。read 系 config-GET も対象に含める（#1 は read 系だった）。

### 5.2 CR-7: バージョン整合検査（通常CI と タグCI で分離、オーナー指定）

- **通常CI（マニフェスト間一致）**: `Cargo.toml`（workspace.package.version）・
  `apps/admin-template/package.json`・`apps/admin-template/src-tauri/tauri.conf.json`・
  全 `packages/*/package.json` の version が**相互に一致**することを検査。
  **例外: root `package.json` の `0.0.0`（private・非配布）は対象外**（オーナー指定）。
  `verify-architecture.mjs` に追加（Node 標準のみ、依存を足さない）。
- **タグCI（タグ名一致）**: リリース（タグ push）時のワークフローで、**タグ名（`vX.Y.Z`）が
  マニフェスト version と一致**することを検査。AD-3 のリリース工程整備（§6）に組み込む。
- **これにより #5 のドリフト**（タグ `v0.1.1` とマニフェスト `0.1.0` の乖離）が今後は
  リリース時に赤くなる。

## 6. 採用導線への反映（adoption-plan の AD 系へ接続）

- **AD-3 訂正**: 「タグ0件」を撤回。リリース工程の完遂（`[Unreleased]` 切り出し + マニフェスト
  bump + GitHub Release + CR-7 タグ名検査）+ GitHub リポジトリ整備（description・topics・
  Template repository 設定・OG 画像・`SECURITY.md`・`CONTRIBUTING.md`・Issue/PR テンプレ）。
- **AD-5 昇格 + 新規2件**:
  - **テンプレート受け入れCI**（ChatGPT 好案・採用）: 一時ディレクトリで
    「コピー → `rename.mjs` → （将来）プリセット → CRUD 生成/レシピ手順 → `pnpm check`/`cargo test`」を
    実行し、**第三者が clone から動く CRUD に到達できることを機械で証明**する。`rename.mjs`
    自体の統合テストも追加。codegen 本体（P4-9）より先に、現状の手動手順が通ることを保証する。
  - **README オンリーのコールドスタート評価**（オーナー指定・新規）: 受け入れCI（機械）とは別に、
    **README だけを頼りに初回導入する評価**を計画に入れる（独立した第三者/コールドスタートの
    エージェントが README のみで起動→最初の CRUD 追加に到達できるか）。ドキュメント自身の
    十分性を測る。North star は「デモ起動5分」ではなく「**最初の CRUD が30分以内**」。
- **README 正直化**: 「次に編集する3ファイル」を「最小入口は3ファイル、**完全な CRUD は
  レシピの9ステップ**」に改める（PR-B の doc 整合に含めてよい）。

## 7. 実施順序（このレビューの結論）

1. **P0（① より先）**: PR-A（#1 + CR-6）→ PR-B（doc/tool + CR-7）→ PR-C（CSP、実動スモーク）。
   3本を分離。PR-A を先頭に置くのは §1 の看板不変条件に関わる実バグのため。
2. **① レイヤ（パッケージ文言外部化）**: P0 の後。
3. **AD-1/AD-2/AD-3（採用導線）**: GitHub 整備・視覚訴求・リリース工程。P0 と並行可。
4. **AD-5（受け入れCI + コールドスタート評価）**: 手動手順の保証を先、codegen（P4-9）は実需で。
5. **配布（P3 相当）**: 署名/リリースのレシピ化。実需ドリブン。

各 PR は roadmap §7（CI ゲート必須）と template-scope §6 のチェックリストに従う。依存を
足さない（verify:architecture の追加検査も Node 標準のみ）。
