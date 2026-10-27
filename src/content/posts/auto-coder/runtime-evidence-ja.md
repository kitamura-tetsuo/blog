---
title: "ベータランタイムの証拠を記録する"
description: "マージされた変更は、ローカルの稼働観測をデプロイや公開から区別します。"
date: 2026-10-27
locale: ja
project: auto-coder
slug: beta-runtime-evidence
translationKey: beta-runtime-evidence
---

CI の成功と READY シグナルだけでは、特定のデプロイ済みワーカーが継続して進行していることは分かりません。2026年10月27日にマージされた [PR #2651](https://github.com/kitamura-tetsuo/auto-coder/pull/2651) は、ベータランタイムのローカルなスモークテストの証拠を生成する内部処理を追加しました。

## 選択されたランタイムと観測を結び付ける

PR は、テスト済みソースの証明、選択された成功実行、ベータの選択とデプロイを、署名された新しい Supervisor とワーカーの観測に関連付けると説明しています。生成処理は不変のプロファイルと期間、サンプル、最終的な証拠を既存の管理ジャーナルに記録します。結果は PASS、FAIL、BLOCKED、SUPERSEDED に分けられ、起動やライフサイクル、ゲートの条件に加え、進行するハートビートを必要とします。

この証拠の役割には範囲があります。PR によると、生成処理は結果の公開、操作の完了処理、ワーカーの変更を行いません。関連する [issue #2605](https://github.com/kitamura-tetsuo/auto-coder/issues/2605) には別の責務が残されています。そのため、ローカルの証拠結果を外部公開の完了と読み替えることはできません。

## 状態と検証

機能は [コミット 7e6b040](https://github.com/kitamura-tetsuo/auto-coder/commit/7e6b040f79cffecd2a52c556104615dfed60e40c) で **マージ済み** です。PR は対象を絞ったローカルテストと本番用コンテナのテストシナリオを報告していますが、記載時点では最新の変更に対する CI 検証が進行中とも述べています。この記事は、それらのテストを独立に実行したとも、実運用環境を検証したとも主張しません。

[ランタイムスモーク生成処理のソース](https://github.com/kitamura-tetsuo/auto-coder/blob/abc65544e4fc43a30d946cacec62d17526869c84/src/auto_coder/management/beta_runtime_smoke.py)
