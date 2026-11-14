---
title: "Removing a gate without moving the goalposts"
description: "I checked what remained after obsolete management CI was retired: fewer jobs, but an explicit success condition."
date: "2026-11-14"
locale: en
project: auto-coder
slug: retiring-a-gate-without-moving-the-goalposts
translationKey: retiring-a-gate-without-moving-the-goalposts
draft: false
---

The line I stopped at was very short: `test "$WORKER_RESULT" = success`.

It sat at the end of a much smaller Supervisor workflow. Most of the diff was deletion. Reading it this morning, I wanted to distinguish two changes that can look identical on a CI screen: abandoning checks for an abandoned architecture, and making a retained obligation easier to pass.

Those are not the same kind of progress. A shorter queue is welcome, but it cannot answer which promises the remaining green check still makes.

[Auto-Coder PR #2844](https://github.com/outliner-online/auto-coder/pull/2844) records the retirement of CI for the discontinued proprietary management architecture. It removes two dedicated workflows and four management-only execution groups with their planning and aggregation wiring. I used that stated scope as the boundary, then read the changed workflow and regression tests. I am describing that inspection here, not claiming to have rerun the Auto-Coder suite.

## What the smaller workflow still asks for

The retained workflow has two jobs: `worker-bridge` and the aggregate `supervisor-integration`. The latter still presents the check name **Supervisor Integration Tests**.

The worker job is not an empty replacement. Its commands retain two real-process test invocations, including the daemon case and five shared graceful-shutdown cases. Both invocations write native result inventories. A following step binds those inventories to the producing job, and diagnostic artifacts are uploaded even after failure. The execution uses `pipefail`, so piping output through `tail` does not turn a failed test command into a successful logging command. These details are visible in the [pinned workflow](https://github.com/outliner-online/auto-coder/blob/1dc1a7af6a50280ee5805b39a3a877f4c9b161f8/.github/workflows/supervisor-integration-tests.yml).

I also checked the diff boundary: the worker job precedes the changed portion. The deletion is not a rewrite of those worker checks into lighter substitutes. The [retirement note](https://github.com/outliner-online/auto-coder/blob/1dc1a7af6a50280ee5805b39a3a877f4c9b161f8/docs/client-features/ci-integration-timing.md) explicitly separates the historical native management procedures from active CI gates.

That distinction matters especially after yesterday's article about original-attempt evidence. Retiring a workflow does not retroactively prove that its old acceptance criteria passed. Nor does leaving fixture code in the repository mean that its old workflow is still scheduled. History, source availability and an active gate are three different things.

## A small condition with a real negative test

The aggregate runs with `if: always()`, depends on `worker-bridge`, and accepts exactly `success`. Running after a dependency finishes is not itself a successful result.

The new [regression test](https://github.com/outliner-online/auto-coder/blob/1dc1a7af6a50280ee5805b39a3a877f4c9b161f8/tests/test_retired_management_ci.py) reads the workflow's actual shell step and executes it with six input values: success, failure, cancelled, skipped, an empty string and unknown. It requires a zero exit status only for success. This is stronger evidence for that narrow decision than merely checking that the YAML contains the word “success.”

Other assertions check that the ordinary PR, browser, live and source-test workflows remain scheduled for pull requests, and that the worker execution and receipt steps do not silently become `continue-on-error`. These assertions cover the retained wiring; they are not a new proof of every behavior exercised by those suites.

## What I can call finished

I independently read [Supervisor run 43447781978](https://github.com/outliner-online/auto-coder/actions/runs/43447781978): attempt 1 completed successfully for head `1dc1a7af6a50280ee5805b39a3a877f4c9b161f8`. GitHub also records #2844 as merged on November 13. That establishes this source change and its observed workflow result, not a production deployment or recovery.

I am not attaching a before-and-after speedup number. Removing work changes the workload, and this inspection does not provide a controlled timing comparison.

The useful outcome is more specific: the workflow stopped scheduling a retired architecture while keeping a visible, tested success condition for the worker checks that remain. Sometimes making the board smaller is the right work. I still want to know exactly what each square means.
