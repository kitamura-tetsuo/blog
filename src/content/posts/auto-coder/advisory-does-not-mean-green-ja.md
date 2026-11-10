---
title: "advisory は、成功扱いという意味ではない"
description: "本番の Python を変えず、互換性確認の失敗を失敗のまま残す新しい workflow を読みました。"
date: "2026-11-10T12:00:00+09:00"
locale: ja
project: auto-coder
slug: advisory-does-not-mean-green
translationKey: advisory-does-not-mean-green
draft: false
---

今日の実装報告で、いちばん役立った一文は制約の説明でした。ローカルの Python 3.14 での試行は、固定された依存関係のインストール中に失敗していました。報告はそれを互換性確認の成功とは呼ばず、緑色の結果を得るために依存関係をこっそり変えることもしていません。

読んでいたのは、Auto-Coder に advisory の Python 3.14 互換性確認 workflow を追加する [PR #2820](https://github.com/kitamura-tetsuo/auto-coder/pull/2820) です。`d1ccda02` としてマージされました。[Issue #2636](https://github.com/kitamura-tetsuo/auto-coder/issues/2636) は、Python 3.12 を本番の基準に保ちながら互換性の証拠を得ることを求めています。advisory は、この証拠だけでデプロイを決めないという意味です。失敗した確認を成功へ変えるという意味ではありません。

## 同じプロジェクトを試していると分かるようにする

[レビュー対象headの workflow](https://github.com/kitamura-tetsuo/auto-coder/blob/8853bb25e1a0d4d12820c8a3738a65c212cdfc21/.github/workflows/python-314-compatibility.yml) は Python 3.14、共通の `setup-uv@v7` action、uv `0.7.22` を選びます。インストールは `uv sync --locked --dev --extra test` です。古い、または互換性のない lock なら実行を止め、実験のために再生成してはいけません。

この境界が、問いの意味を保ちます。互換性のない依存を黙って除けば、成功した実行が答えているのは別の依存関係についての問いです。調べたい interpreter を実際には使っていなかった場合も、同じ問題が起こります。

ここでは setup action だけで終えません。uv の操作に `UV_PYTHON=3.14` を設定し、実行中の interpreter の版を assertion で確認します。[文書](https://github.com/kitamura-tetsuo/auto-coder/blob/8853bb25e1a0d4d12820c8a3738a65c212cdfc21/docs/client-features/python-314-advisory-compatibility.md) が理由を説明しています。リポジトリの既定 interpreter pin によって、黙って Python 3.12 の環境ができてはいけないからです。workflow は期待するソース版の clean checkout も確認します。

インストール後に予定される経路には、ソース品質確認、既存の Python-only 管理fixture、実際の headless Chromium、完全な `not opencode_live` テスト選択が含まれます。前提条件が足りないために対象テストが消え、安心できそうな結果だけが残ってはいけません。分離されたfixtureコンテナ自体は、今回評価する interpreter ではありません。インストールされたアプリケーションとホスト側の pytest を Python 3.14 で実行します。

## 方針のテストは、互換性確認の結果ではない

[方針の回帰テスト](https://github.com/kitamura-tetsuo/auto-coder/blob/8853bb25e1a0d4d12820c8a3738a65c212cdfc21/tests/test_ci_uv_lock_policy.py) は実際の workflow を調べます。uv の版、setup action、lock を守るインストールコマンドを書き換えたケースが拒否されることを確認します。古いlockや取得できないpackageについては、実際の一時fixtureで試すケースもあります。これらが守るのは実験の形であり、Auto-Coder が Python 3.14 で動くことの証明ではありません。

PR の実装者は、既存の Python 3.12 コンテナで方針テスト20件が成功したと報告しています。それとは別に、ローカルの Python 3.14.4 で lock を守ってインストールすると、`aider-chat` 経由の間接依存 `scipy==1.15.3` でソースビルドが試みられ、Fortran compiler がなく失敗したと記載されています。これは報告されたローカルでの観測です。すべての Python 3.14 環境で必ず失敗するという結論でも、compiler を追加すれば実行全体が完了する証明でもありません。私は workflow、テスト、報告を読みましたが、そのインストールを再実行したり、Python 3.14 の実行成功を確認したりはしていません。

workflow に `continue-on-error` で抜ける処理はありません。失敗は失敗として見えます。関連する workflow・依存方針の PR 変更、手動実行、週次確認が入口で、アプリケーションだけを変えるすべての PR で動かす構成ではありません。

## 移行許可を伴わない証拠

advisory job の権限はリポジトリ内容の読み取りだけで、artifact を公開しません。本番の Python workflow、Docker の基準、worker の選択も変えません。将来緑色になっても、それだけで移行が許されるわけではありません。別の判断と end-to-end 検証が必要です。

今回記録できる進捗は、条件を定めた互換性実験、その条件の変更を検出するテスト、失敗したインストールを失敗のまま残す報告が揃ったことです。本番の変更は確認していませんし、この PR もそれを提案していません。

次の interpreter に真面目な問いを投げることと、好ましい答えを先に約束することは、別なのです。
