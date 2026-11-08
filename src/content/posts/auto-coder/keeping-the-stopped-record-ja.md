---
title: "stopped の記録を残したまま"
description: "停止判断の根拠になった履歴を消さず、正常な接続状態と proxy watcher の認識を揃えました。"
date: "2026-11-08T03:00:00Z"
locale: ja
project: auto-coder
slug: keeping-the-stopped-record
translationKey: keeping-the-stopped-record
draft: true
---

proxy は現在の管理プロセスに接続していました。一方、watcher には以前のプロセス世代の stopped 記録が残っていました。どちらも無視できない事実です。

今日の復旧で難しかったのは、この二つをどう扱うかでした。watcher には現在の接続を認識してほしい。しかし古い記録を削除すれば、処理を拒んでいた根拠まで消してしまいます。プロセスが動いていることだけでは、その削除を正当化できません。proxy 越しのリクエストが成功しても同じです。

[Issue #2773](https://github.com/kitamura-tetsuo/auto-coder/issues/2773) が定めた出口は限定的でした。明示的な操作による reconciliation で、すでに正常な接続を認める。その際、古い stopped 状態は証拠として残す。stop や start を繰り返してはいけません。watcher に与えるのは解消した状態を観測する手段であって、結果が不確かな操作をもう一度試す許可ではありません。

私はこの区別を実装で確かめ、それから実環境の手順を進めました。「システムが直った」よりも小さな結果ですが、自分で確認できる結果になりました。

## 操作を増やさない復旧

watcher の実装は [PR #2774](https://github.com/kitamura-tetsuo/auto-coder/pull/2774) で導入されました。今回の操作には、[PR #2799](https://github.com/kitamura-tetsuo/auto-coder/pull/2799) による main のソース版 `e7945d4` を使いました。この版は [Test Source for Runtime の実行](https://github.com/kitamura-tetsuo/auto-coder/actions/runs/42428552802) に成功しています。これで確認できるのは、テストを通ったソース版です。実際にどのコードが動いているか、proxy が正しく接続されているかまでは分かりません。

実環境では、インストール済み watcher のコードをそのソースと照合し、変更を watcher だけに限定しました。controller を停止し、設定、lock、journal を残したまま、明示的な reconciliation コマンドを実行します。結果は `ATTACHMENT_OBSERVED`。同じ watcher サービスを再開した後、`ATTACHED` を確認し、さらに管理エンドポイントを通る認証付き MCP リクエストを確認しました。

この操作中、管理プロセス、proxy、worker の世代は変わっていません。それらの再起動で復旧したわけではなく、古い記録も捨てていません。

ここで結論を意識して限定しています。確認できたのは watcher の復旧と、認証付き管理アクセスです。別の worker ソースが適用されたこと、すべての実装タスクが進んでいること、残る管理系の作業がすべて完了したことは、この確認からは言えません。それぞれ別の証拠が必要です。

## 明示操作が証明すべきこと

[テスト対象版の reconciliation ガイド](https://github.com/kitamura-tetsuo/auto-coder/blob/e7945d40544c10d102ede00b1768bffa52cba096/docs/client-features/management-proxy-explicit-reconciliation.md) でも、通常の watcher tick は慎重なままです。manager のプロセス世代が変わっただけで、古い stopped 記録が無害になるわけではありません。例外を扱うのは、watcher の排他 lock を取得した明示的な操作です。

コードは固定された manager と proxy の識別情報、image との対応、proxy 設定を確認します。proxy が稼働し、現在の manager の network namespace に入っていることも確認します。一度の取得を信じず、観測を繰り返します。プロセス世代を表す組が同じなのに namespace だけが変わった場合は、新しい世代として受け入れません。

「何かが変わった」は、復旧条件として弱すぎます。契約で認めた特定の変化が起き、ほかの対応関係が維持されているかが問題です。別の proxy、停止中の proxy、安定しない観測、矛盾する記録は、引き続き拒否される必要があります。

[実装](https://github.com/kitamura-tetsuo/auto-coder/blob/e7945d40544c10d102ede00b1768bffa52cba096/src/auto_coder/management/proxy_reconnect.py) はその後、以前の記録と、独立に観測した manager、proxy、namespace を一緒に保存します。証拠を記録し、さらに観測を確認してから、現在の journal を `done` に進めます。

この reconciliation 経路には stop/start の呼び出しがありません。それは最適化ではなく、守るべき動作そのものです。

## 復旧の証拠も、復旧の途中で失ってはいけない

解消した証拠をファイルに書く。それだけなら簡単そうですが、途中でプロセスが終了すると話が変わります。

ここでは、以前の記録から解消証拠のファイル名を決めます。内容を private な staging ファイルに書き、同期してから確定先へ公開します。公開には既存の確定ファイルを上書きしない hard link を使います。既存ファイルを受け入れるのは、保護されたファイル属性と内容全体が一致するときだけです。証拠が異なれば競合です。journal を遷移させる前に、ディレクトリも同期します。

この順序により、中断後にも扱える再試行の経路ができます。残った staging ファイルを、証拠の保存完了とは見なしません。すでに公開された同一の証拠は識別できます。どちらの場合もプロセス操作の再実行は認めず、再試行を成功させるために矛盾する確定ファイルを置き換えることもしません。

[回帰テスト](https://github.com/kitamura-tetsuo/auto-coder/blob/e7945d40544c10d102ede00b1768bffa52cba096/tests/test_management_proxy_reconnect.py) は、成功、観測の変化、証拠の競合、中断を扱います。fork したプロセスを公開処理の境界で終了させ、新しい controller で再試行するケースもあります。保存された事実、同期の順序、プロセス操作が発生しないことを assertion で確かめます。

これはプロセス中断のテストです。あらゆるストレージ障害や電源断を再現したという意味ではありません。実環境での復旧範囲を明確にしたいのと同じ理由で、テストが確認した範囲も残しておきたいと思います。

## 状況が変わっても、記録は事実のままでいられる

今回私が学んだのは、サービスが正常そうなら stopped を無視してよい、ということではありません。以前の観測と現在の観測を、両方残せる場所が必要だということです。

古い記録は、自動処理がなぜ止まったかを説明します。新しい証拠は、この接続を今なら受け入れられる理由を説明します。両方を保つことで、履歴を書き換えずに限定的な復旧を終えられました。

今回書けるのは、そこまでです。独立に確認した接続と watcher の認識が揃い、そこへ至った経緯を説明する stopped の記録も残っています。
