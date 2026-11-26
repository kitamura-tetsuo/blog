---
title: "The fix that waited on itself"
description: "Three green pull requests were waiting on a commit that did not exist. Following one of those waits exposed a loop in the rollout plan."
date: "2026-11-26"
locale: en
project: auto-coder
slug: the-fix-that-waited-on-itself
translationKey: the-fix-that-waited-on-itself
draft: false
---

The detail that stopped me was an empty commit field. I was checking why three Auto-Coder pull requests kept coming back with the same deferral after CI passed. There were changes staged in the retained checkouts, but there was no corrective commit recorded. Git had reported `Author identity unknown`. I could stop looking for a failing test and start asking what the worker knew about a change it had prepared but not published.

I opened [#2939](https://github.com/outliner-online/auto-coder/issues/2939) to track recovery. The longer-term plan gave new corrective commits a verified Controller App identity while leaving review and approval with the separate Reviewer App. It made sense to put that change after [#2878](https://github.com/outliner-online/auto-coder/issues/2878), the issue that activates the Controller App in the worker. I added that dependency and checked that GitHub showed it in both directions.

Then I followed the arrow one step further. #2878 waits on [#2876](https://github.com/outliner-online/auto-coder/issues/2876), whose implementation is [PR #2937](https://github.com/outliner-online/auto-coder/pull/2937). That was one of the three pull requests I started with. The dependency I added was real, and so was the wait that never appeared on the GitHub graph: #2937 was stuck on the recovery that #2939 was supposed to supply.

The important distinction is where execution stopped. The [commit path](https://github.com/outliner-online/auto-coder/blob/88c348554988d2496a0379e50d78ff5f0639e359/src/auto_coder/local_review_repair.py#L730-L747) stages the correction, tries the commit, and checkpoints its SHA before proceeding toward publication. On the failure path it preserves the worktree and records an indeterminate result. Keeping the output is valuable, but the same broad state can also represent less clear failures. An empty SHA by itself is not permission to send anything again.

I checked whether a new commit from the existing PR owner would clear the wait. The [resumption code](https://github.com/outliner-online/auto-coder/blob/88c348554988d2496a0379e50d78ff5f0639e359/src/auto_coder/editable_review.py#L174-L204) looks up retained publication by repository and PR before it lets another reviewer in. For this indeterminate record, it returns the deferral without deciding whether a later head already contains the fix. A newer head could be useful evidence. It is not, on its own, an exit.

That left room for a different operation. In [#2940](https://github.com/outliner-online/auto-coder/issues/2940), I split out a reconciliation that does not publish. If the worker can positively establish that the old attempt stopped before push and that a newer head on the same PR already contains the retained correction, it can record that the old attempt was superseded. It retains the evidence and sends the new head through fresh CI and independent review. If the evidence is missing, the patch is only partly present, or publication may have started, the proposal leaves the hold in place. In particular, staged files and an error string alone are not enough to settle every old record.

#2939 still owns the startup identity check and the publication of an eligible correction for a head that is still current. #2940 does not need the Controller App rollout because its job is to recognize something that already happened, not to write a commit. Both issues were awaiting specification review when I wrote this, and #2937 had not resumed. I had changed the order in which the fixes could be attempted, not recovered a running worker. Following the wait one step further was what made that difference visible.
