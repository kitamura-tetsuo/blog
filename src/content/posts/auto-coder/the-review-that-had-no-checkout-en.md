---
title: "The review that had no checkout"
description: "Two Outliner issues reached the worker, but Muse stopped before launch. I traced the handoff from repository selection to the checkout used for review."
date: "2026-11-20"
locale: en
project: auto-coder
slug: the-review-that-had-no-checkout
translationKey: the-review-that-had-no-checkout
draft: false
---

I was checking how far two Outliner issues had made it through Auto-Coder. The label changes for [#5970](https://github.com/outliner-online/outliner/issues/5970) and [#5949](https://github.com/outliner-online/outliner/issues/5949) reached the worker through GitHub webhooks. Both issues had passed an independent specification review, and the parser recognized their requirements. A few seconds apart, the worker deferred both with a specification validation error.

I had to find out whether the worker's reviewer had rejected something in the specifications. The [investigation recorded in Auto-Coder #2862](https://github.com/outliner-online/auto-coder/issues/2862) put the failure earlier. Muse stopped at a Git `HEAD` check while preparing a read-only review, before it launched. Neither issue reached implementation, and there was no model verdict to inspect.

## Where the repository name stopped

In the [ordinary Issue review path](https://github.com/outliner-online/auto-coder/blob/bca522ce92f836dec0ee8aed7728e16b3dd277df/src/auto_coder/automation_engine.py#L4117-L4144), the review service knows the repository name. That path does not bind the selected checkout, the local copy of the repository that the reviewer is meant to inspect. The [scheduler](https://github.com/outliner-online/auto-coder/blob/bca522ce92f836dec0ee8aed7728e16b3dd277df/src/auto_coder/validation_scheduler.py#L46-L64) already preserves the submitting context. It can carry a directory binding when one is set; it cannot derive a path from the repository name.

[Muse's preparation](https://github.com/outliner-online/auto-coder/blob/bca522ce92f836dec0ee8aed7728e16b3dd277df/src/auto_coder/muse_client.py#L1114-L1138) uses a directory scoped to the invocation when one is supplied, and otherwise falls back to the process working directory. Its [snapshot check](https://github.com/outliner-online/auto-coder/blob/bca522ce92f836dec0ee8aed7728e16b3dd277df/src/auto_coder/muse_client.py#L266-L275) requires a valid Git `HEAD` before starting the read-only review.

A later check found no valid `HEAD` in the worker's process directory. That fits the fallback shown in the source, although the diagnostic records did not identify the directory each invocation used. I could verify where the Git check failed in the call path, but not the exact directory it checked each time.

## The PR path already had an example

The [PR review code](https://github.com/outliner-online/auto-coder/blob/bca522ce92f836dec0ee8aed7728e16b3dd277df/src/auto_coder/pr_review_execution.py#L133-L149) supplies a directory for the duration of the call, checks the requested `HEAD` before and after review, and restores the previous binding even if the call fails. That is an example of keeping the directory local to one review without changing where the whole process runs. Issue review takes a separate path.

The [open follow-up](https://github.com/outliner-online/auto-coder/issues/2862) calls for a regression test that starts at ordinary Issue intake and reaches Muse's real Git check with the controller outside a worktree. It also covers overlapping reviews in two repositories. A missing or mismatched checkout should stop the review before model launch, without producing a decision or starting implementation. A valid `HEAD` in the wrong repository is still the wrong place to review.

Both issues made it through intake. The next useful result is a test that shows the selected checkout reaching the launch boundary.
