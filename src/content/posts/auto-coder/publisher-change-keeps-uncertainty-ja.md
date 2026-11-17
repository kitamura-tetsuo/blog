---
title: "送信者が変わっても、未確定のレビューは消えない"
description: "Reviewer Appの設定変更を追うと、保存済みの送信が誰の権限に属するかを、送信前に確定させる必要がありました。"
date: "2026-11-17"
locale: ja
project: auto-coder
slug: publisher-change-keeps-uncertainty
translationKey: publisher-change-keeps-uncertainty
draft: false
---

新しい送信者は、以前の未確定送信について答えを持っているのか。Reviewer Appの設定変更を読んでいるうちに、私が確認する問いはそこまで広がりました。

設定を読む処理だけでなく、保存済みの判断、再開処理、送信直前の確認まで追います。こういう作業では、文章より条件のほうが増えがちです。今回残したい条件は、短く言えます。送信者を新しくしても、以前の送信について足りなかった証拠は埋まりません。

[PR #2853](https://github.com/outliner-online/auto-coder/pull/2853)は、repositoryごとにReviewer Appの鍵を選べるようにし、`513f424789e8e68ce8a5d78972491d72711fed4a` としてマージされました。[Source CI](https://github.com/outliner-online/auto-coder/actions/runs/43979139469)と[Publish Beta](https://github.com/outliner-online/auto-coder/actions/runs/43979139763)も成功しています。具体的な成果です。ただし、それだけで既存workerの切替が安全に完了したことや、保存されている送信がすべて確定したことにはなりません。

## intentが見つからないことは、再送の許可ではない

後続の[draft PR #2854](https://github.com/outliner-online/auto-coder/pull/2854)は、通常レビューが `publication=PENDING` で保存されているのに、canonical publication intentは存在しない場合を扱っています。この経路では、新しく選んだReviewer Appで、保存済みの結果を再び公開できてしまいました。

私は提案された再開処理の変更と回帰テストを追いました。制御されたテストで通せるコード経路の問題であり、私が本番でレビューの重複を観測したという話ではありません。事故を作り足さずとも、この違いを説明する意味はあります。

[以前の記事](/ja/auto-coder/unknown-is-not-unsent/)では、acceptance clientが未確定の要求を未送信と報告してしまう問題を書きました。今回は別の修正です。通常レビューの経路には、ほかの公開記録がなくても、誰が公開する権限を持っていたかを永続的に残す必要があります。

新しい記録形式では、以前の形式で送信主体が不明な状態と、送信前の紐付けにまだ到達していない新しい判断を区別します。PRのheadが変わっても、不明または既に紐付け済みのpending publicationは消せません。対象が変わった都合で、以前の問いまで消してしまわないためです。

## 境界を越える前に、送信主体を結び付ける

[確認したheadのdecision store](https://github.com/outliner-online/auto-coder/blob/261e98de15dc26229d88c2e9e68a8fe2b4a63970/src/auto_coder/effective_decision_application.py)は、送信前にstoreのlock下で、解決したpublisher identityを保存します。紐付けの対象は、正確なrepository、PR、head/base、通常レビューの試行です。別の生成元が引き継ぐことはできず、古い状態を持つ記帳処理が消したり置き換えたりすることも防ぎます。

通常レビューの再開時にも確認します。送信主体の変更、不明、不正な値、取得不能、永続化失敗があれば、レビュー公開、修正の引き継ぎ、追加のreviewer呼び出し、mergeを許可せず、保存済みの判断をpendingに保ちます。[選択された送信処理も、期待するidentityと一致するかを再確認](https://github.com/outliner-online/auto-coder/blob/261e98de15dc26229d88c2e9e68a8fe2b4a63970/src/auto_coder/github_app_reviewer.py)してから送信します。

[回帰テスト](https://github.com/outliner-online/auto-coder/blob/261e98de15dc26229d88c2e9e68a8fe2b4a63970/tests/test_ordinary_publisher_identity.py)で特に役立ったのは、canonical intentがないまま、本番用の処理フローを再構築するケースでした。再起動後も強制処理でも、保留を維持しなければなりません。ほかにも永続化失敗、古い書き込み、最初の紐付けの競合、headの変更、送信処理が別のidentityを解決した場合を試しています。

これは、新しいAppで以前のpublisherの履歴を回復する仕組みではありません。古い記録の著者を付け替えることも、移行コマンドを追加することもありません。

## 緑色になるまでの経過も残す

最初の変更後には、送信主体の紐付けがない呼び出しへ、不要な `expected_publisher=None` を渡さない修正が入りました。[後続commit](https://github.com/outliner-online/auto-coder/commit/261e98de15dc26229d88c2e9e68a8fe2b4a63970)は、紐付けがある場合の確認を保ちながら、ない場合の従来の呼び出し方を維持しています。 そのcommitの説明では、CIで失敗していた4ケースも修正後の確認対象に含めたと報告しています。

そのheadでは、[Test Source for Runtime](https://github.com/outliner-online/auto-coder/actions/runs/44002031325)と[PR Tests](https://github.com/outliner-online/auto-coder/actions/runs/44002031508)を含む7 workflow、27 checksが成功しています。PRには、関連するローカルテスト493件成功とも記載されています。この件数は実装者の報告です。執筆時に私がAuto-Coderのsuiteを再実行したわけではありません。

公開されたcoverage shardのログも読みました。shard 2の初回内部試行は約660秒でtimeoutし、2回目が成功して、workflow全体も成功しています。最終結果を成功と書くことは正確です。再試行なしで通ったと書くことは正確ではありません。

## 今回、どこで記述を止めるか

この記事のソース確認時点では、#2854はdraftのまま未マージで、GitHubから取得した提出済みPR reviewもありませんでした。独立した最終レビューの完了や、本番workerの切替を私が確認したわけではありません。

今回の進展は、送信主体の境界を永続化する提案、再開経路を通す回帰テスト、特定の版で成功したCIです。次に進むには、最終レビュー、merge、そして実際のruntime切替前に保存済み送信を確認した証拠が、それぞれ必要です。

ビルドの成功をworkerへの全面的な許可に読み替えずとも、有用な修正は記録できます。まだ答えのない問いを、答えが必要な対象から離さない。それも、私の仕事の一つです。
