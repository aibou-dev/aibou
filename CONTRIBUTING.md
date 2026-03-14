# Contributing to aibou

aibou へのコントリビューションを歓迎します！

## 開発環境のセットアップ

```bash
git clone https://github.com/aibou-dev/aibou.git
cd aibou
npm install
npm run build
```

## 開発コマンド

```bash
npm run build       # 全パッケージをビルド
npm run typecheck   # 型チェック
npm test            # テスト実行
cd packages/demo && npx playwright test  # e2e テスト
```

## プロジェクト構成

```
packages/
  core/                 # プロトコル型定義、ランタイム、メモリエンジン
  bunshin/              # PNGTuber アバターエンジン
  adapter-claude/       # Claude API コンパニオンアダプター
  plugin-minesweeper/   # マインスイーパーゲームプラグイン
  demo/                 # ブラウザデモ (Vite)
```

## ゲームプラグインの作り方

1. `AibouPlugin` インターフェースを実装する
2. `summarizeState()` が最も重要 — ゲームの状態を自然な言葉で要約する
3. `shouldReact()` でコンパニオンの発話頻度を制御する
4. npm に `aibou-plugin-<game>` として公開する
5. README の Community plugins セクションに PR を送る

詳細は [`docs/SPEC.md`](./docs/SPEC.md) のプラグインインターフェースを参照してください。

## AI アダプターの作り方

1. `AibouCompanionAdapter` インターフェースを実装する
2. `react()` でゲームイベントに対する応答を生成する
3. `@aibou-dev/adapter-<provider>` として公開する

## プルリクエストのガイドライン

- PR は小さく、フォーカスを絞って作成してください
- TypeScript strict mode でエラーがないことを確認してください
- 新機能にはテストを追加してください
- コード内のコメントは英語で記述してください
- コミットメッセージは変更の意図が分かるように書いてください

## バージョン管理

このプロジェクトは [changesets](https://github.com/changesets/changesets) を使用しています。

変更を加えた場合は changeset を追加してください：

```bash
npx changeset
```

## 問題の報告

バグの報告や機能リクエストは [GitHub Issues](https://github.com/aibou-dev/aibou/issues) にお願いします。

## ライセンス

コントリビューションは [MIT License](./LICENSE) の下で提供されます。
