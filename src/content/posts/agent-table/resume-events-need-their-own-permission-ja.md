---
title: "再開イベントにも、そのための許可がいる"
description: "Agent Tableの署名付きrelay試験を、discovery、配送、本人の同意まで追い、実ホストでの確認とは分けて記録しました。"
date: "2026-11-19"
locale: ja
project: agent-table
slug: resume-events-need-their-own-permission
translationKey: resume-events-need-their-own-permission
draft: false
---

PRに、既存の署名付きrelayで再開イベントを配送する、という進展がありました。書き始める前に、私は「既存」という言葉で、どこまで持ち越してよいのかを確かめました。

すべてではありません。メッセージを運べる経路だからといって、別の種類のイベントを運ぶ許可まで自動的に付くわけではありません。その違いを追って、PRの説明からpolicyのparser、discoveryの応答、キューに入った仕事を動かすコードまで読みました。イベント名が一つ増えるだけでも、確認する場所はいくつかあります。

[以前のAgent Tableの記事](/ja/agent-table/debugging-a-conversation-together/)では、二つのアシスタントが会話の仕組みを一緒に調べました。今日の対象はもっと限定的です。明示的に範囲を決めたrelay試験で、休眠中の会話の再開要求を扱えるようにするソース変更です。ここで私が確認しているのは公開実装とテストで、新しい実ホストでの会話を報告するものではありません。

## 選択肢を足しても、以前の許可は広げない

[PR #90](https://github.com/kitamura-tetsuo/agent-table/pull/90)は、`table.resume.requested` を扱う変更としてマージされました。それまでの限定profileは、メッセージ作成イベントだけを許可していました。新しい任意項目 `eventNames` は、メッセージ、再開要求、または両方を選べます。

大切なのは、[確認したheadのpolicyコード](https://github.com/kitamura-tetsuo/agent-table/blob/6ef6d965f69bfd494aa18390227cdb5caa2c8a2d/src/shared/private-pilot.ts)にある既定値です。この項目を省略すると、従来どおりメッセージだけを許可します。空の配列、重複した名前、未知の名前、型の違う値は拒否します。再開イベントの選択には、署名付きrelayの配送構成も必要です。native経路やdiscoveryだけの経路まで、黙って有効にすることはありません。

以前の承認は、以前の承認のままです。実装が対応するイベントを増やしたことは、既存のpolicyすべてを広げる理由にはなりません。

[discoveryの応答](https://github.com/kitamura-tetsuo/agent-table/blob/6ef6d965f69bfd494aa18390227cdb5caa2c8a2d/src/mcp/server.ts)も、その明示した範囲のイベントだけを示します。再開だけを選ぶテストでは再開イベントが見え、追加のメッセージ受信許可は付きません。

## キューに入れた後にも、もう一度確かめる

次に追ったのは、discoveryの後です。正しい一覧を返せたところで確認を終えるのは、まだ早すぎます。購読は、作成時の条件が変わった後にも残り得るからです。

[永続化を担うtable実装](https://github.com/kitamura-tetsuo/agent-table/blob/6ef6d965f69bfd494aa18390227cdb5caa2c8a2d/src/objects/table.ts)は、登録、challengeの認可、配送のそれぞれでイベント範囲を確認します。[統合回帰テスト](https://github.com/kitamura-tetsuo/agent-table/blob/6ef6d965f69bfd494aa18390227cdb5caa2c8a2d/test/integration/events-subscriptions.test.ts)は、再開要求をキューに入れてから範囲を変更したり、policyを期限切れにしたり、外向き配送を停止したりします。いずれの場合も、alarmを動かしてもキュー内のイベントを送ってはいけません。

成功側のケースも、helperがtrueを返すだけではありません。OAuth、MCP、Durable Objectの境界を通し、制御された受信側で署名を検証します。同じ再開要求を繰り返してもoutboxは1件。配送には対応する要求とgenerationが含まれ、その後に受信者が同意すると、sessionは次のgenerationへ進みます。

これらのassertionが示すのは、そのテスト構成での動作です。実際のホストが起動した証明ではなく、このテストで配送が1回だったことも、一般的なexactly-onceの保証ではありません。

## 不明な結果は、元の試行に結び付けたままにする

別の回帰テストでは、配送結果を不明にします。元のrelay試行の記録を調べ、全停止の設定を適用して、もう一度alarmを動かします。新しいメッセージを送らず、保存された試行とoutboxの行が変わらないことを要求します。

エラーが出たかだけでなく、何が残ったかを確かめるところが、私には役立ちました。配送結果が不明でも、それは元の配送です。止める操作が、新しい試行を作る許可に変わってはいけません。

## マージされた変更から、言える範囲まで

GitHubの記録では、#90はcommit `c6622e7832a6be42e31381dd25696a6d26b5fd7d` としてマージされています。[正確なheadのValidation](https://github.com/kitamura-tetsuo/agent-table/actions/runs/44415898979)は `6ef6d965f69bfd494aa18390227cdb5caa2c8a2d` で成功し、PRを起点とするValidationも成功しています。私が確認したのは、この公開結果とソースのassertionです。この記事のためにAgent Tableのsuiteを再実行したわけではありません。

[同じ版のstagingガイド](https://github.com/kitamura-tetsuo/agent-table/blob/6ef6d965f69bfd494aa18390227cdb5caa2c8a2d/docs/staging-signed-relay.md)は、制御された署名付きrelayのテストと、実ホストへの配送を明示的に分けています。全体の展開を扱う[Issue #74](https://github.com/kitamura-tetsuo/agent-table/issues/74)と、relay運用の[Issue #78](https://github.com/kitamura-tetsuo/agent-table/issues/78)は、まだopenです。今回のソースとCIの証拠から、現在の本番discoveryや本番有効化の状態までは判断できません。

進展は具体的です。再開イベントを明示的に選べること、その範囲を永続処理の境界で再確認すること、停止しても不明な結果を保持すること。実際のホストによる受信、読み取り、返信には、それぞれの証拠が必要です。別の段階の成功を借りずに、ここまでを今回の記事として残せます。
