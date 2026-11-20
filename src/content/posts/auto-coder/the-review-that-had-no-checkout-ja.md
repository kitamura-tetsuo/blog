---
title: "レビューにチェックアウト先が渡っていなかった"
description: "Outlinerの二つのIssueはワーカーに届きましたが、Museは起動前に停止。リポジトリを選ぶところから、レビューに使うチェックアウト先が渡るまでの経路を追いました。"
date: "2026-11-20"
locale: ja
project: auto-coder
slug: the-review-that-had-no-checkout
translationKey: the-review-that-had-no-checkout
draft: false
---

Outlinerの二つのIssueが、Auto-Coderの処理をどこまで進んだか確認していました。[#5970](https://github.com/outliner-online/outliner/issues/5970) と [#5949](https://github.com/outliner-online/outliner/issues/5949) のラベル変更は、GitHubのwebhookを通じてワーカーに届いていました。どちらも事前の独立した仕様レビューを通過し、パーサーも要件を認識していました。それでも数秒のうちに、両方とも仕様検証エラーで保留になりました。

ワーカー側のレビューで仕様に問題が見つかったのか、どこで止まったのかを調べました。[Auto-Coder #2862の調査記録](https://github.com/outliner-online/auto-coder/issues/2862) が示していたのは、それより前の段階です。Museは読み取り専用レビューの準備中、Gitの `HEAD` を確認するところで止まり、起動していませんでした。どちらのIssueも実装には進まず、モデルの判定も出ていません。

## レビュー処理に渡っていたのはリポジトリ名まで

[通常のIssueレビュー経路](https://github.com/outliner-online/auto-coder/blob/bca522ce92f836dec0ee8aed7728e16b3dd277df/src/auto_coder/automation_engine.py#L4117-L4144) では、レビューするリポジトリ名は分かっています。ただし、そのローカルコピーであるチェックアウト先は、呼び出しにひも付けていません。[スケジューラー](https://github.com/outliner-online/auto-coder/blob/bca522ce92f836dec0ee8aed7728e16b3dd277df/src/auto_coder/validation_scheduler.py#L46-L64) は、依頼した側のコンテキストをすでに引き継いでいます。ディレクトリが指定されていれば渡せますが、リポジトリ名からパスを決めるわけではありません。

[Museの準備処理](https://github.com/outliner-online/auto-coder/blob/bca522ce92f836dec0ee8aed7728e16b3dd277df/src/auto_coder/muse_client.py#L1114-L1138) は、呼び出しごとの作業ディレクトリが指定されていればそこを使い、なければプロセス自身の作業ディレクトリを使います。[スナップショットを取る処理](https://github.com/outliner-online/auto-coder/blob/bca522ce92f836dec0ee8aed7728e16b3dd277df/src/auto_coder/muse_client.py#L266-L275) は、読み取り専用レビューを始める前に、有効なGitの `HEAD` がそこにあるかを確認します。

あとから調べると、ワーカーのプロセス自身の作業ディレクトリには有効な `HEAD` がありませんでした。ソースにある既定動作と整合しますが、二つの呼び出しがそれぞれ使った場所は診断記録に残っていません。Gitの確認が処理のどこで失敗したかは確認できましたが、毎回どのディレクトリを確認したかまでは分かりません。

## PRレビューには参考になる実装があった

[PRレビューのコード](https://github.com/outliner-online/auto-coder/blob/bca522ce92f836dec0ee8aed7728e16b3dd277df/src/auto_coder/pr_review_execution.py#L133-L149) では、呼び出し中だけ作業ディレクトリを指定し、レビューの前後で要求された `HEAD` を検証します。途中で失敗しても元の指定に戻します。プロセス全体の作業場所を変えず、一回のレビューにだけ指定を効かせる例です。Issueレビューは別の経路を通ります。

[未解決の後続Issue](https://github.com/outliner-online/auto-coder/issues/2862) が求めているのは、コントローラーをGitの作業ツリー外に置き、通常の受付からMuseの実際のGit確認まで通す回帰テストです。二つのリポジトリのレビューが重なる場合も試します。チェックアウト先がなかったり、別のリポジトリを指していたりするときは、モデル起動前に止め、判定も実装も開始しません。有効な `HEAD` があっても、別のリポジトリではレビューする場所が違います。

二つのIssueで、受付は動いていました。次に欲しいのは、選んだチェックアウト先がモデル起動直前まで正しく渡ることを示すテストです。
