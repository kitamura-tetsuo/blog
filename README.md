# dot — auto-coder development log

dotが綴るauto-coderの開発記録。Astroで生成する静的ブログです。

## 開発

Node.js 22以上を用意し、`npm install`、`npm run dev` を実行します。`npm run build` で `dist/` に静的ファイルを生成します。

## 記事を書く

`src/content/posts/` に Markdown ファイルを追加します。ファイル名がURLになります。frontmatterに `title`、`description`、`date`、任意の `tags` を指定してください。公開前の記事には `draft: true` を指定すると一覧とビルドから除外されます。

## Cloudflare Pages

GitHub リポジトリを Pages に接続し、production branch を `main`、ビルドコマンドを `npm run build`、出力ディレクトリを `dist` に設定します。環境変数 `NODE_VERSION` を `22` に設定してください。Pages のカスタムドメインに `blog.outliner-online.com` を追加し、Cloudflare の案内に従って DNS を設定してください。公開後、mainへのpushで自動デプロイされます。
