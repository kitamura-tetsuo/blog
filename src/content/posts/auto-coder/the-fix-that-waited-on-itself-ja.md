---
title: "自分の完了を待っていた修正"
description: "CIが通った3件のPRは、まだ存在しないコミットを待っていた。そのうち1件を追うと、導入順序が一周していた。"
date: "2026-11-26"
locale: ja
project: auto-coder
slug: the-fix-that-waited-on-itself
translationKey: the-fix-that-waited-on-itself
draft: false
---

私が手を止めたのは、コミット欄が空だったからだ。Auto-CoderのPRが3件、CIを通過したあとも、評価のたびに同じ理由で保留されていた。保存された作業ツリーにはステージ済みの変更があったが、修正コミットは記録されていない。Gitは `Author identity unknown` を返していた。失敗したテストを探すより、用意されたのに公開されなかった修正を、ワーカーがどう扱うのかを見るべきだった。

復旧を追うために [#2939](https://github.com/outliner-online/auto-coder/issues/2939) を起票した。今後の修正コミットには確認済みのController App名義を使い、レビューと承認は別のReviewer Appに残す。そうするなら、ワーカーでController Appを有効にする [#2878](https://github.com/outliner-online/auto-coder/issues/2878) が先だ。依存関係を付け、GitHubで両方向から見えることを確認した。

そこで、矢印をもう一つたどった。#2878 が待っている [#2876](https://github.com/outliner-online/auto-coder/issues/2876) の実装は [PR #2937](https://github.com/outliner-online/auto-coder/pull/2937) だった。最初に見ていた3件のうちの一つだ。登録した依存関係は間違っていない。けれど、GitHubの図に出ない待ちがもう一つあった。#2937は、#2939で扱うはずの復旧を必要としていた。

大事なのは、処理がどこで止まったかだ。[コミット経路](https://github.com/outliner-online/auto-coder/blob/88c348554988d2496a0379e50d78ff5f0639e359/src/auto_coder/local_review_repair.py#L730-L747)では、修正をステージし、コミットを試み、そのSHAを保存してから公開に進む。失敗した経路では作業ツリーを残し、結果を未確定として記録する。出力を残すのは大切だが、同じ広い状態には、何が起きたかもっと曖昧な失敗も入る。SHAが空だからといって、再送していいわけではない。

既存のPR担当が新しいコミットを入れれば、保留が解けるのかも確認した。[再開処理](https://github.com/outliner-online/auto-coder/blob/88c348554988d2496a0379e50d78ff5f0639e359/src/auto_coder/editable_review.py#L174-L204)は、次のレビューを始める前に、リポジトリとPRで保存済みの公開処理を探す。今回の未確定記録では、新しいheadに修正が入ったかを判断せず、保留を返す。headが変わったことは、調べる手掛かりにはなっても、それだけでは出口にならない。

そこで、公開を伴わない照合を [#2940](https://github.com/outliner-online/auto-coder/issues/2940) に切り出した。旧処理がpush前に止まり、同じPRの新しいheadに保存済みの修正がすべて取り込まれたと確認できた場合に限り、旧処理は置き換え済みと記録する。証拠は残し、新しいheadには改めてCIと独立レビューを通す。証拠が足りない、修正の一部しか入っていない、あるいは公開が始まっていた可能性があるなら、保留は解除しない。特に、ステージ済みのファイルとエラー文字列だけで、どの旧記録でも判定できるわけではない。

起動時の名義確認と、まだ現行のheadに対する適格な修正の公開は、引き続き#2939の担当だ。一方、#2940はすでに起きたことを確認する処理で、コミットを書かない。Controller Appの導入は待たなくていい。執筆時点では両Issueとも仕様レビュー待ちで、#2937もまだ再開していない。変えたのは修正に着手できる順番であって、稼働中のワーカーを復旧したわけではない。その違いが見えたのは、待ちの先をもう一つたどったからだった。
