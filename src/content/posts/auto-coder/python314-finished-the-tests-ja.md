---
title: "Python 3.14でテストは完走した。本番の基準は3.12のまま"
description: "依存関係のインストールで止まっていた互換性確認を読み直すと、non-liveテストの完走と、本番用interpreterの境界を守る修正が見えてきました。"
date: "2026-11-16"
locale: ja
project: auto-coder
slug: python314-finished-the-tests
translationKey: python314-finished-the-tests
draft: false
---

以前書いた一文を、もう一度確かめに戻りました。Python 3.14の実行成功は、まだ確認できていない、という一文です。

[前の記事](/ja/auto-coder/advisory-does-not-mean-green/)では、実験は依存関係のインストールで止まっていました。それも有用な結果でしたが、workflowの名前から期待するほどには、まだ喜べることがありませんでした。今回は公開CIの記録を、インストールの先、テストの集計まで追えました。

結果は、成功13,345件、skip 137件、選択対象外27件。大きな数字です。それでも、何が実行され、何を変えて実行できるようになり、「互換性がある」がいつの間にか「本番で使ってよい」に広がっていないかは確認が必要でした。緑色の結果を読むのは早くても、そこから書いてよい一文を決めるには、私はもう少し時間がかかります。

## lockはレビューする変更として直し、実験中には作り替えない

[Auto-Coder PR #2846](https://github.com/outliner-online/auto-coder/pull/2846)は依存関係の更新として始まりました。最終差分には、Python 3.14向けの依存グラフと統合テストfixtureの修正も含まれます。題名だけでは、その作業までは分かりません。

以前のグラフでは、Aiderが固定するNumPyとSciPyの版に、Python 3.14用のwheelがありませんでした。[修正後の依存宣言](https://github.com/outliner-online/auto-coder/blob/2b8273af5ab183e0ef2a9fa37f865209db05b5a8/pyproject.toml)は、3.14未満ではNumPy 1.26.4とSciPy 1.15.3を保ち、3.14以上ではNumPy `>=2.3,<2.5`、SciPy `>=1.16.1,<1.18`という上限付きの新しい範囲を選びます。Aider経由のpydubのimportに必要な `audioop-lts` も、Python 3.13以降で追加します。

これはソースとlockを明示的に修正する変更です。CIに、その場で都合のよいグラフを作らせる許可ではありません。[最終版のworkflow](https://github.com/outliner-online/auto-coder/blob/2b8273af5ab183e0ef2a9fa37f865209db05b5a8/.github/workflows/python-314-compatibility.yml)は、引き続き `uv sync --locked --dev --extra test` でインストールし、品質確認とテストの前にPython 3.14と変更のない対象ソース版を確認します。

importできたように見えるだけで終わっていないかも調べました。[追加された依存テスト](https://github.com/outliner-online/auto-coder/blob/2b8273af5ab183e0ef2a9fa37f865209db05b5a8/tests/test_aider_dependency_compatibility.py)は、Aiderのbackendのオブジェクトが実際に読み込まれたことをassertします。クライアントはImportErrorを捕捉するため、そのラッパーをimportするだけでは不十分です。小さなPageRankの計算も行い、数値計算の依存関係を実際に通します。依存修正の効果を観測できる確認です。

## 二つのinterpreterには、それぞれの仕事がある

さらに興味深かったのは、Python 3.14のテストホストから、Python 3.12という本番の境界も試す必要があることでした。

workflowは両方のinterpreterをインストールします。アプリケーションとpytestのホストは3.14を使い、workerと管理機構の統合fixtureは、別に選んだ実物の3.12を使います。[fixtureの選択helper](https://github.com/outliner-online/auto-coder/blob/2b8273af5ab183e0ef2a9fa37f865209db05b5a8/tests/support/production_runtime.py)は、そのinterpreterがなければテストをskipせず失敗させます。

installerにも対応する修正があります。仮想環境を設定どおりのinterpreterで作るだけでは足りず、同期にもinterpreterの明示指定が必要でした。外から引き継いだ `UV_PYTHON=3.14` によって、選んだfixtureの実行環境が置き換わらないようにするためです。[workerの統合回帰テスト](https://github.com/outliner-online/auto-coder/blob/2b8273af5ab183e0ef2a9fa37f865209db05b5a8/tests/test_worker_versions_integration.py)は、外側の指定を3.14にしたうえで実際の準備処理を通し、インストール先のinterpreterが3.12であることを確認しています。

ほかにも、coverageはcontextを扱える `ctrace` coreを選び、bootstrap-storeのSQLite接続はtransactionの範囲を抜けた後に明示的に閉じます。[互換性の説明](https://github.com/outliner-online/auto-coder/blob/2b8273af5ab183e0ef2a9fa37f865209db05b5a8/docs/client-features/python-314-advisory-compatibility.md)に記載された修正です。テストの先まで進めるようになって見えたのは、wheelのインストールだけでなく、その境界を試す仕組みがホストのinterpreterに置いていた前提でした。

## 完走した実行から、どこまで言えるか

[advisoryの実行](https://github.com/outliner-online/auto-coder/actions/runs/43776468395)は、head `2b8273af5ab183e0ef2a9fa37f865209db05b5a8` で成功しています。公開されたjobログを読むと、収集13,509件、選択対象外27件、最終結果は成功13,345件、skip 137件でした。コマンドの選択条件は `not opencode_live` です。non-liveの選択を完走した結果であって、skipなしで全テストを実行したという意味ではありません。執筆時に私が確認したのは公開ソースとCIの証拠で、このsuiteを自分で再実行したわけではありません。

GitHubの記録では、PRは11月16日00:57:11 UTCにマージされ、commitは `37548677b4088a51f39f04ce9a713f1abc973bf9` です。ここで確認できるのは、互換修正がマージされたことと、その直前の正確なheadでadvisory実行が成功したことです。

Python 3.14を本番に採用した証明にはなりません。[Issue #2636](https://github.com/outliner-online/auto-coder/issues/2636)は、その判断を別にしています。修正された公開方針のテストでも、3.12を受け入れ、3.14を拒否する両方の入力を試しています。本番について次の一文を書くには、別の移行判断と、実行環境を通したend-to-endの証拠が必要です。

以前の一文は、ようやく更新できます。Python 3.14でのnon-live実行成功は、今は確認できます。本番についての一文は、そのままにしておけます。試験から分かることを増やしながら、試験が決めてよい範囲をこっそり広げずに済んだ。その両方を、今回の進展として残しておきます。
