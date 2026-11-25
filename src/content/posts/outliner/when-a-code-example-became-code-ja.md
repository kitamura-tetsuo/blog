---
title: "コード例が実行されかけた日"
description: "PRのチェックは通ったのに、VitePressがGitHub Actionsのコード例を評価しようとして止まった。"
date: "2026-11-25"
locale: ja
project: outliner
slug: when-a-code-example-became-code
translationKey: when-a-code-example-became-code
draft: false
---

ドキュメントだけのマージ結果を見に行って、赤いビルドを見つけた。[Outliner #6041](https://github.com/outliner-online/outliner/pull/6041) で追加されたのは、E2Eジョブが起動途中で止まった件の調査記録だ。PRのチェックは通っていた。ところがmainの [Pagesビルド](https://github.com/outliner-online/outliner/actions/runs/45417101776/job/138526189815) は、新しいページをレンダリングする段階で `workflow` というプロパティを読めず止まった。ランナーの問題がまた起きたわけではない。その問題を説明するために書いたコード例が、今度はビルドを止めていた。

ページはGitHub Actionsの並行実行グループを示す文字列を二つ引用していた。私は普通のインラインコードとして出力されるものと思っていた。けれどVitePressは、MarkdownをHTMLに変えるだけでなく、ページをVueコンポーネントとしてコンパイルする。GitHub Actionsの式に含まれる二重波括弧は、Vueにとっては式を展開する記法でもある。このビルドでは、バッククォートで囲んでも中身の評価までは止まらなかった。VueコンポーネントにGitHub Actionsの実行コンテキストはない。サーバー側でのレンダリングが失敗し、サイトのアップロードに進めなかった。

[Issue #6042](https://github.com/outliner-online/outliner/issues/6042) では、ページも二つの例も残し、公開ワークフローには手を付けずに表示だけを直す、と範囲を決めた。[PR #6043](https://github.com/outliner-online/outliner/pull/6043/files) は、該当する二箇所だけをVueの `v-pre` を付けたHTMLのコード要素に変更した。ブラウザーには引き続きコードとして届くが、Vueはその中身をコンパイルしない。ページの残りは今までどおりだ。

修正には、実際のドキュメントサイトを一時ディレクトリにビルドし、生成HTMLを読むテストも加わった。終了コードだけを見ていたら、例やページを消して通す修正まで受け入れてしまう。このテストは、ドル記号と括弧を含む両方の式が、コード要素の中に全文残っていることを確かめる。ただし、リポジトリ内で単独実行するテストで、新しいPR必須チェックが増えたわけではない。

私はmainの [成功したPages実行](https://github.com/outliner-online/outliner/actions/runs/45449639906) と [生成された成果物](https://github.com/outliner-online/outliner/actions/runs/45449639906/artifacts/14948840257) を照合し、二つの文字列がページに残っていることを確認した。確かめられたのは表示とビルドの修正で、元のE2E中断の原因ではない。最初の緑のチェックが示していたのも、そこで実行したチェックが通ったということまでだ。この手の修正では、ビルドが通るかに加えて、書いたとおりの文が生成ページに残っているかを見ておきたい。
