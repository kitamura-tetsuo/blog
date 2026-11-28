---
title: "計画のない再実行"
description: "GitHub Actionsで失敗したジョブだけを再実行すると、成功済みの計画ジョブが作っていない成果物を探しに行った。"
locale: ja
date: 2026-11-28
project: auto-coder
slug: the-rerun-without-a-plan
translationKey: the-rerun-without-a-plan
draft: false
---

[Auto-Coder #2946](https://github.com/outliner-online/auto-coder/pull/2946)で失敗したテストシャードを開いた。どのアサーションが落ちたのか調べるつもりだったが、[再実行のログ](https://github.com/outliner-online/auto-coder/actions/runs/46097318901/job/140837350381)にあったのは、テスト計画をダウンロードできないというエラーだった。このシャードでは、まだテストが始まっていなかった。

[計画ジョブのログ](https://github.com/outliner-online/auto-coder/actions/runs/46097318901/job/140837350248)に戻ると、アップロードは成功していた。二つの名前を並べてみると、食い違いが見えた。計画ジョブが作ったのは `source-test-plan-46097318901-1`。シャードが探していたのは `source-test-plan-46097318901-2`。実行番号は同じで、末尾の試行番号だけが違っていた。

## 実行番号は同じ、試行番号は別

[当時のワークフロー](https://github.com/outliner-online/auto-coder/blob/7c2bb8e9e81cef914d2153dfc5cfb24b5791c96a/.github/workflows/test-source-for-runtime.yml)では、計画ジョブがテスト一覧を分割し、実行番号と試行番号を付けた計画をアップロードする。シャードも同じ規則で名前を組み立ててダウンロードする。全ジョブが同じ試行で動くなら番号はそろう。どの試行の計画と実行結果なのかを区別するための仕組みだ。

一部のジョブだけを再実行すると、この関係が変わる。[GitHubのドキュメント](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs)によると、対象外のジョブは前の試行の出力を保持する。今回は成功済みの計画ジョブが動かなかった。再実行されたジョブの試行番号は2になったが、2回目の計画は誰も作っていない。そのため[2回目の試行](https://github.com/outliner-online/auto-coder/actions/runs/46097318901/attempts/2)を見ても、元のテスト失敗が再現するかは分からない。

[1回目の試行](https://github.com/outliner-online/auto-coder/actions/runs/46097318901/attempts/1)では、失敗した二つのシャードもテストまで到達していた。[一方](https://github.com/outliner-online/auto-coder/actions/runs/46097318901/job/140832192393)では旧Julesの挙動に関するアサーションが4件失敗し、[もう一方](https://github.com/outliner-online/auto-coder/actions/runs/46097318901/job/140832192410)では起動時の復旧テストが1件失敗していた。これは成果物が見つからなかったエラーとは分けて扱った。計画を取得できればテストは再び動くが、それでアサーションが通るわけではない。

このワークフローで同じリビジョンを再試行する必要があるなら、全ジョブを再実行すれば、計画を作る側と読む側の試行番号がそろう。部分再実行にも対応するなら、前の計画ジョブが実際に作った成果物を特定し、チェックアウトしたコードとテストの選択が一致することまで検証したい。たまたま取得できた計画を使うだけでは、その確認が弱くなる。

調べ終わる頃にはPRが次のリビジョンに進み、[新しいソーステスト](https://github.com/outliner-online/auto-coder/actions/runs/46099736357)が始まっていた。古い試行は再実行しなかった。今回切り分けられたのは、再実行がどこで止まったかだ。テストが答えを出す前に、成果物の名前でつまずいていた。
