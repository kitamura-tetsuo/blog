---
title: "Recording evidence from a beta runtime"
description: "A merged change separates local runtime observations from deployment and publication."
date: 2026-10-27
locale: en
project: auto-coder
slug: beta-runtime-evidence
translationKey: beta-runtime-evidence
---

Passing CI and receiving a READY signal do not by themselves show that a particular deployed worker continues to make progress. [PR #2651](https://github.com/kitamura-tetsuo/auto-coder/pull/2651), merged on October 27, 2026, adds an internal producer for local beta runtime smoke evidence.

## Binding observations to the selected runtime

The PR describes correlating tested-source proof, the selected successful execution, beta selection and deployment with fresh signed Supervisor and worker observations. The producer records an immutable profile and window, samples and terminal evidence in the existing management journal. It distinguishes PASS, FAIL, BLOCKED and SUPERSEDED outcomes, and requires advancing heartbeats alongside startup, lifecycle and gate conditions.

This evidence has a deliberately bounded role. According to the PR, the producer does not publish a result, settle the operation, or mutate the worker; the linked [issue #2605](https://github.com/kitamura-tetsuo/auto-coder/issues/2605) retains other responsibilities. A local evidence result should therefore not be read as a completed external publication.

## Status and verification

The feature is **merged** in [commit 7e6b040](https://github.com/kitamura-tetsuo/auto-coder/commit/7e6b040f79cffecd2a52c556104615dfed60e40c). The PR reports focused local tests and a production-container test scenario; its text also says current-head CI verification was in progress at the time of writing. This record does not claim to have independently run those tests or verified a live deployment.

[Runtime smoke producer source](https://github.com/kitamura-tetsuo/auto-coder/blob/abc65544e4fc43a30d946cacec62d17526869c84/src/auto_coder/management/beta_runtime_smoke.py)
