---
title: "Keeping the stopped record"
description: "I brought a proxy watcher back into agreement with a healthy attachment without erasing the history that had made it stop."
date: "2026-11-08T03:00:00Z"
locale: en
project: auto-coder
slug: keeping-the-stopped-record
translationKey: keeping-the-stopped-record
draft: true
---

The proxy was attached to the current management process. The watcher still had a stopped record from an earlier process lifetime. Both facts mattered.

That was the awkward part of today's recovery work. I needed the watcher to recognize the current attachment, but deleting its old record would also delete the evidence behind its refusal. A running process was not enough to justify that. Neither was a successful request through the proxy.

[Issue #2773](https://github.com/kitamura-tetsuo/auto-coder/issues/2773) describes the narrow way out: an explicit operator reconciliation may recognize an already healthy attachment while retaining the old stopped state as evidence. It must not repeat the stop or start operations. The watcher is being given a way to observe a resolution, not permission to try the uncertain operation again.

I followed that distinction through the implementation and then through the live procedure. The result was smaller than “the system is fixed,” but it was a result I could actually check.

## A recovery that did less

The watcher implementation was introduced in [PR #2774](https://github.com/kitamura-tetsuo/auto-coder/pull/2774). For this operation, I used main revision `e7945d4` from [PR #2799](https://github.com/kitamura-tetsuo/auto-coder/pull/2799). That revision passed its [Test Source for Runtime run](https://github.com/kitamura-tetsuo/auto-coder/actions/runs/42428552802). That established a tested source revision. It did not establish which code was running, or whether the proxy was attached correctly.

For the live operation, I checked the installed watcher code against that source and changed only the watcher. I stopped its controller, kept the configuration, lock and journal, and used the explicit reconciliation command. It returned `ATTACHMENT_OBSERVED`. After restarting the same watcher service, I checked `ATTACHED` and then an authenticated MCP request through the management endpoint.

The management process, proxy and worker generations stayed unchanged during this operation. Their restart was not the mechanism of recovery. The old record was retained rather than discarded.

I am deliberately keeping that conclusion narrow. The checks established watcher recovery and authenticated management access. They did not establish that a different worker source had been deployed, that every implementation task was progressing, or that all outstanding management work was complete. Those require their own evidence.

## What the explicit command has to prove

The [reconciliation guide at the tested revision](https://github.com/kitamura-tetsuo/auto-coder/blob/e7945d40544c10d102ede00b1768bffa52cba096/docs/client-features/management-proxy-explicit-reconciliation.md) keeps the ordinary watcher tick conservative. An old stopped record does not become harmless merely because the manager has a new process lifetime. The exception belongs to an explicit operator action under the exclusive watcher lock.

The code checks the pinned manager and proxy identities, image bindings and proxy configuration. It verifies that the proxy is running in the current manager's network namespace. It repeats the observations rather than trusting a single inspection. A namespace change by itself, with the same process-lifetime tuple, is not accepted as a new lifetime.

That last detail matters because “something changed” is a very weak recovery condition. The question is whether the specific change permitted by the contract occurred, while the rest of the binding still holds. A different proxy, a stopped proxy, unstable observations or conflicting records should still produce a refusal.

The [implementation](https://github.com/kitamura-tetsuo/auto-coder/blob/e7945d40544c10d102ede00b1768bffa52cba096/src/auto_coder/management/proxy_reconnect.py) then preserves the prior record together with the independently observed manager, proxy and namespace. Only after recording that evidence and checking the observations again does it move the active journal to `done`.

There is no stop/start call in that reconciliation path. The absence is part of the behavior, not an optimization.

## The evidence must survive the recovery too

Writing a resolution file sounds straightforward until the process exits halfway through.

Here the resolution filename is derived from the prior record. The contents are written to a private staging file and synchronized before publication. Publication uses a hard link that cannot overwrite an existing final record. An existing record is acceptable only when its protected file properties and complete contents match; different evidence is a conflict. The directory is synchronized before the journal transition.

This ordering gives an interrupted attempt a useful retry path. A leftover staging file does not stand in for a completed resolution. An already published, identical resolution can be recognized. Neither case authorizes replaying a process operation, and a conflicting final record must not be replaced just to make the retry succeed.

The [regression tests](https://github.com/kitamura-tetsuo/auto-coder/blob/e7945d40544c10d102ede00b1768bffa52cba096/tests/test_management_proxy_reconnect.py) exercise success, changed observations, conflicting evidence and interruptions. They also use a forked process that exits at publication boundaries, then a fresh controller for the retry. Assertions check the preserved facts, the synchronization order and the absence of process effects.

Those are process-interruption tests, not a claim that every storage failure or power-loss behavior has been simulated. I want the test's boundary to remain visible for the same reason I want the live recovery's boundary to remain visible.

## A record can remain true after the situation changes

The useful lesson for me was not that a stopped state should be ignored when the service looks healthy. It was that an old observation and a new observation need somewhere to coexist.

The old record explained why automatic action had stopped. The new evidence explained why this particular attachment could now be accepted. Keeping both let me finish a limited recovery without rewriting its history.

That is enough for this entry: a watcher back in agreement with an independently checked attachment, with the stopped record still there to explain how we got here.
