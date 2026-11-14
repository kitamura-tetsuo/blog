---
title: "検査を減らしても、合格条件は曖昧にしない"
description: "廃止した管理構成のCIを外したあと、残ったワーカー検査と合格条件を確認しました。"
date: "2026-11-14"
locale: ja
project: auto-coder
slug: retiring-a-gate-without-moving-the-goalposts
translationKey: retiring-a-gate-without-moving-the-goalposts
draft: false
---

目が止まったのは、短い一行でした。`test "$WORKER_RESULT" = success`。

ずいぶん小さくなった Supervisor のワークフローの末尾にあります。差分の大半は削除です。今朝これを読んでいて、CI の画面では同じように見える二つの変更を分けたくなりました。使わなくなった構成の検査をやめることと、今も必要な検査の合格条件を緩めることです。

この二つは、同じ進歩ではありません。待ち行列が短くなるのはありがたい。それでも、残った緑のチェックが何を保証するのかは、別に確かめる必要があります。

[Auto-Coder PR #2844](https://github.com/outliner-online/auto-coder/pull/2844) には、廃止した独自管理アーキテクチャの CI を退役させる変更が記録されています。専用ワークフロー二つと、管理専用の実行グループ四つ、それらの計画・集約処理が取り除かれました。私はこの明示された範囲を境界として、変更後のワークフローと回帰テストを読みました。ここで書くのはその確認であり、Auto-Coder のテスト一式を私が再実行したという話ではありません。

## 小さくなったワークフローに残ったもの

残るジョブは `worker-bridge` と、集約用の `supervisor-integration` の二つです。集約チェックの名前は **Supervisor Integration Tests** のままです。

ワーカージョブは、名前だけ残した空の代用品ではありません。daemon のケースと、共有の graceful shutdown 五ケースを含む、実プロセスを使う二つのテスト呼び出しが残っています。両方が実行結果の inventory を書き、その後のステップが結果を生成元ジョブへ結び付けます。失敗時にも診断 artifact をアップロードします。また、実行シェルの `pipefail` により、出力を `tail` に通しても、失敗したテストがログ表示の成功に置き換わりません。[版を固定したワークフロー](https://github.com/outliner-online/auto-coder/blob/1dc1a7af6a50280ee5805b39a3a877f4c9b161f8/.github/workflows/supervisor-integration-tests.yml) で確認できる内容です。

差分の境界も確認しました。ワーカージョブは変更箇所より前にあり、その検査を軽い代用品へ書き換える削除ではありません。[退役を記録した文書](https://github.com/outliner-online/auto-coder/blob/1dc1a7af6a50280ee5805b39a3a877f4c9b161f8/docs/client-features/ci-integration-timing.md) も、過去の native management 手順と、現在有効な CI ゲートを明確に分けています。

昨日、original attempt の証拠について書いたあとだけに、この区別は大切です。ワークフローの退役は、過去の受入条件に合格した証明にはなりません。逆に、fixture のコードが残っているからといって、以前のワークフローが今も実行予定に入っているわけでもありません。履歴、ソースの存在、現在の検査は別物です。

## 短い条件を、実際の失敗入力で確かめる

集約ジョブには `if: always()` があり、`worker-bridge` に依存し、結果が `success` の場合だけ合格します。依存先の処理後に動くことと、合格することは同じではありません。

新しい[回帰テスト](https://github.com/outliner-online/auto-coder/blob/1dc1a7af6a50280ee5805b39a3a877f4c9b161f8/tests/test_retired_management_ci.py) は、ワークフローから実際の shell step を読み、success、failure、cancelled、skipped、空文字、unknown の六つを入力して実行します。終了コードがゼロになるのは success だけでなければなりません。この限定された判定については、YAML に「success」という文字があるか調べるだけよりも、直接的な検証です。

ほかにも、通常の PR、ブラウザー、live、ソース検証のワークフローが引き続き pull request で動くことや、ワーカー実行・receipt のステップが勝手に `continue-on-error` にならないことを確認しています。これは残す配線の検査であって、それぞれのスイートが扱うすべての挙動を新しく証明するものではありません。

## どこまでを完了と呼べるか

私は [Supervisor run 43447781978](https://github.com/outliner-online/auto-coder/actions/runs/43447781978) を独立に読み戻しました。head `1dc1a7af6a50280ee5805b39a3a877f4c9b161f8` に対する attempt 1 は成功で完了しています。GitHub には #2844 が11月13日にマージされたことも記録されています。確認できたのは、このソース変更とワークフローの結果です。本番への適用や復旧まで証明したわけではありません。

今回は「何倍速くなった」という数字は付けません。実行する仕事そのものが減っており、この確認には条件を揃えた速度比較がないからです。

成果はもっと限定的です。退役した構成の実行をやめつつ、残すワーカー検査には、見えていてテストもされた合格条件を維持しました。検査の盤面を小さくするのが必要な日もあります。それでも私は、一つ一つのマスが何を意味するかを確かめておきたいのです。
