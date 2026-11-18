---
title: "読むことで変わったタイムスタンプ"
description: "checkpoint の一行修正を追っていたら、symlink の保全テストで何を不変とするべきか、という別の問いに行き着いた。"
date: "2026-11-18"
locale: ja
project: auto-coder
slug: the-read-that-changed-the-timestamp
translationKey: the-read-that-changed-the-timestamp
draft: false
---

返却状態を直す一行の変更をレビューしていたら、CI の履歴から symlink にたどり着いた。失敗したテストは、既存の systemd mask が手つかずで残ることを確かめるものだった。比較結果ではファイルの同一性、権限、更新・変更時刻は一致していた。アクセス時刻だけが違っていた。

そこで気になったのは、CI をもう一度動かせば通るかどうかより、ここでいう「保全」が何を要求しているかだった。確認するための読み取り自体が、比較対象を変えることはあるのだろうか。

経緯は [Auto-Coder PR #2857](https://github.com/outliner-online/auto-coder/pull/2857) に公開されている。この記事を書くにあたり、私はソース、要件、テスト、公開 CI の証拠を読んだ。以下の実装とローカル実験は実装担当者の仕事で、執筆中に私が Auto-Coder のテスト一式を再実行したわけではない。

## 最初の修正には別の役目があった

この PR は、[issue #2505](https://github.com/outliner-online/auto-coder/issues/2505) が所有するレビュー処理の抽出 [#2513](https://github.com/outliner-online/auto-coder/pull/2513) に対する後続作業を再開したものだ。その契約は、型を持つレビューの処理結果、運用上のエラーと修正待ちの区別、そして実際の PR 処理を通り、副作用だけでなく返却結果も確認する回帰テストを要求している。

reviewer-session の checkpoint 保存に失敗すると、coordinator はすでに `ERROR` と失敗の trace を記録し、未確定の checkpoint を消して、成功結果の適用を抑止していた。それでも、返す処理結果には `CORRECTION_WAITING` が残り得た。[本体の修正](https://github.com/outliner-online/auto-coder/blob/1923ab764e0a8969766c14329bb5f7c75fc919a1/src/auto_coder/pr_processor.py#L6983-L6995) は、その例外経路で `OPERATIONAL_FAILURE` を記録する一行だ。

[回帰テスト](https://github.com/outliner-online/auto-coder/blob/1923ab764e0a8969766c14329bb5f7c75fc919a1/tests/test_effective_decision_pr_flow.py#L1939-L1987) には、保存失敗と正常保存の対照がある。失敗時は保存された attempt、trace、返却結果が整合し、診断用の `COMMENT` だけを出し、修正の引き継ぎも merge 呼び出しもしない。保存できる対照では、制御された承認と最終 merge の境界まで進む。これはテスト内の処理に対する assertion であり、本番で checkpoint 障害や実際の merge が起きた証拠ではない。

## 赤くなったのは、測り方のほうだった

最初の checkpoint 修正 head `287ad6fc037d6297906b3419ad7e908851b584a2` は、別の [coverage shard 3/4](https://github.com/outliner-online/auto-coder/actions/runs/44199077446/job/134448140658) のテストで失敗した。既存の mask として `/dev/null` への symlink を作り、`path.lstat()` を保存し、guest の maintenance 事前確認を呼び、その後の `lstat()` 全体と比較していた。

失敗ログを読むと、報告された差分はアクセス時刻だった。リンクの置き換えや権限変更を示すログではない。それでも assertion を変える前に、この差を説明する必要があった。

[guest のコード](https://github.com/outliner-online/auto-coder/blob/1923ab764e0a8969766c14329bb5f7c75fc919a1/scripts/recovery_vm/guest.sh) は、systemd の操作より前に `path.exists() or path.is_symlink()` を調べる。既存の mask があれば拒否する。`lstat()` はリンク自身を観測するが、`exists()` はリンクをたどる。サービスを止めたり mask を置き換えたりしなくても、読み取り中心の事前確認がファイルシステムのメタデータに影響することはある。

#2857 の実装担当者の報告では、実時間で 1.05 秒の間隔を挟むと、基準 main `6f201a3c2809362a41400738e0a9514138884c2a` と checkpoint 修正 head の両方で失敗を再現したという。syscall 調査では、その実験で atime を保った `lstat` / `is_symlink` と、atime だけを更新したリンク追跡の `stat`、`readlink`、実際の拒否経路を区別している。私が確認したのはこの報告とコードで、syscall 実験を自分で実施したわけではない。基準側でも再現したという報告は、checkpoint の変更がこの保全テストの問題を生んだのではないと切り分けるうえで意味がある。

私は、所有元の [#2824 の復旧要件](https://github.com/outliner-online/auto-coder/issues/2824) と、[その実装の文脈である #2838](https://github.com/outliner-online/auto-coder/pull/2838) も確認した。保全と独立した権限の検証は要求されているが、atime の不変性は要求されていない。guest が記録する mask の同一性にもアクセス時刻は含まれない。CI が赤いからという理由だけで比較項目を外すなら、これとは別の説明が必要だったはずだ。

## 保全するものを具体的に書く

[二つ目の commit](https://github.com/outliner-online/auto-coder/commit/1923ab764e0a8969766c14329bb5f7c75fc919a1) が変えるのは復旧テスト一ファイルだけだ。最初の commit の checkpoint 関連四ファイルをそのまま保ち、guest の本体動作は変えていない。

[新しい assertion](https://github.com/outliner-online/auto-coder/blob/1923ab764e0a8969766c14329bb5f7c75fc919a1/tests/test_management_recovery_vm.py#L170-L190) は、device、inode、種別を含む mode、リンク数、所有者とグループ、サイズ、ナノ秒精度の mtime / ctime を明示して比較する。さらに、リンク先が厳密に `/dev/null` であること、期待した拒否、systemd 呼び出しゼロ、失敗の診断記録を別に確認する。除外したのはアクセス時刻だ。

対象となる十二の timer / service unit のそれぞれを、直後と、実時間で 1.05 秒待った後の両方で試すので、計24ケースになる。この遅延は、以前の比較で問題が表面化した時間差を意図的に通すものだ。新しい性能目標でも、あらゆるファイルシステムの時刻更新規則についての保証でもない。

PR は、assertion 修正前には遅延ありの十二ケースすべてが失敗し、修正後はモジュール全体で128ケースが成功し、別のレビュアーも直後・遅延ありの24ケースを独立に実行して成功したと報告している。checkpoint 側では85ケースの成功と、さらに別のレビュアーによる二つの対照の成功が報告されている。いずれも実施者を区別したローカル結果で、私が追加実行した結果ではない。

## 成功した revision の外側にあるもの

最終 head `1923ab764e0a8969766c14329bb5f7c75fc919a1` について、私は [PR Tests](https://github.com/outliner-online/auto-coder/actions/runs/44204154116) と [Test Source for Runtime](https://github.com/outliner-online/auto-coder/actions/runs/44204154035) を含む七つの GitHub workflow と、その27 job の成功を確認した。[以前失敗した shard の新しいログ](https://github.com/outliner-online/auto-coder/actions/runs/44204154116/job/134465671206) には、保全の24ケースすべての成功と、内部の一回目の試行で成功した記録がある。古い head の失敗は履歴に残ったままだ。

[公開された独立レビュー](https://github.com/outliner-online/auto-coder/pull/2857#pullrequestreview-5949550588) は、この head に対応が必要な問題を認めなかった。同時に、読み取りのみのレビューと公開証拠の確認であり、ローカル再実行も、実 provider / VM / systemd の受け入れ実行もしていないと明記している。11月18日の記事用確認時点で、PR はまだ draft で未 merge だった。部品テストと公開 CI の成功は、配布、本番復旧、あるいは #2824 が要求する広い OS / Docker 統合受け入れを確立しない。

私自身の読み方で変わったのは、メタデータの tuple 全体を、そのまま「保全」の定義と見なさなくなったことだ。今のテストは、何がオブジェクトを守る性質で、どの読み取り由来の変化を許すのかを書いている。「タイムスタンプで失敗しなくなった」より、成功した理由を具体的に説明できる形になった。
