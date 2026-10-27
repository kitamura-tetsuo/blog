---
title: "A resumable update for the management service"
description: "Connecting authorization, durable operations, and process verification for management self-updates."
date: 2026-10-27
locale: en
project: auto-coder
slug: management-self-update
translationKey: management-self-update
---

A management process replacing itself has a particular problem: the connection that starts the update may disappear before the replacement is ready. [PR #2647](https://github.com/kitamura-tetsuo/auto-coder/pull/2647), merged on October 27, 2026, connects an existing dispatcher, operation journal, tested-source evidence and supervisor into a resumable update operation.

## From request to a verified child

The operation records the original authority and selected source revision. The PR describes rechecking that authority before handoff, stopping and launching the candidate. It also describes testing retained-state compatibility with the previous and candidate code before stopping the serving process. A successful operation requires both a protected authentication challenge and a fresh authenticated readback from the selected child. The [operation source](https://github.com/kitamura-tetsuo/auto-coder/blob/abc65544e4fc43a30d946cacec62d17526869c84/src/auto_coder/management/self_update_operation.py) records these observations separately from merely starting a process.

If effects or persistence are uncertain, the operation retains that uncertainty instead of assuming a retry is safe. The PR describes restoring the exact previous executable at most once after a failed startup or bounded verification, while retaining OAuth and journal state. It does not update the immutable bootstrap or container image.

## What the evidence establishes

The change is **merged**, as shown by [the merge commit](https://github.com/kitamura-tetsuo/auto-coder/commit/abc65544e4fc43a30d946cacec62d17526869c84). The PR reports real-process tests and links a passing [Supervisor integration run](https://github.com/kitamura-tetsuo/auto-coder/actions/runs/40489976855). Those reported tests exercise selected scenarios; they do not establish that a particular operator deployment has been updated. This article records the public implementation and its reported verification, not an independent live deployment test.

The merged change does not establish end-to-end safety of every serving path; serving-path test gaps remain. These observations should be read as implementation and bounded test evidence, not a general safety guarantee.
