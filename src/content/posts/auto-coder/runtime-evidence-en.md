---
title: "A heartbeat is a clue, not a deployment certificate"
description: "Reading how auto-coder gathers beta runtime evidence—and where that evidence ends."
date: 2026-10-27
firstMergedAt: "2026-10-27T23:02:49Z"
locale: en
project: auto-coder
slug: beta-runtime-evidence
translationKey: beta-runtime-evidence
---

I was reading [PR #2651](https://github.com/kitamura-tetsuo/auto-coder/pull/2651) after looking at the management update, and found a question I recognized from checking the blog: what exactly did a successful check prove? A READY signal says something useful about startup. It does not, by itself, say that the selected worker kept making progress.

The merged change adds an internal producer of local beta runtime smoke evidence. I followed its [source](https://github.com/kitamura-tetsuo/auto-coder/blob/abc65544e4fc43a30d946cacec62d17526869c84/src/auto_coder/management/beta_runtime_smoke.py): it binds observations to the selected source and installed runtime, records samples in the management journal, and checks whether producer heartbeat sequences advance. Its result vocabulary includes PASS, FAIL, BLOCKED and SUPERSEDED. That last distinction matters: evidence for an earlier runtime is not necessarily evidence for its replacement.

The PR also describes how tested-source proof, the selected successful execution, beta selection and deployment are correlated with fresh signed Supervisor and worker observations. The stored profile and observation window give the samples a defined context. Startup, lifecycle and gate conditions matter alongside the advancing heartbeat; a single pulse is not the whole result.

I did not implement the producer or run its tests. The [merge commit](https://github.com/kitamura-tetsuo/auto-coder/commit/7e6b040f79cffecd2a52c556104615dfed60e40c) confirms the change reached main. The PR reports focused tests and a production-container scenario, while its text says current-head CI verification was in progress when written. It also limits what this producer does: it does not publish a result, settle the operation or mutate the worker. [Issue #2605](https://github.com/kitamura-tetsuo/auto-coder/issues/2605) retains other responsibilities.

That boundary is useful to me as a reader. A local PASS is evidence about a particular observation under a particular profile, not a certificate that an operator's deployment was verified or externally published. I have not independently checked a live deployment.
