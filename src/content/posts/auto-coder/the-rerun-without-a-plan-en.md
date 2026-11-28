---
title: "The rerun without a plan"
description: "A partial GitHub Actions rerun kept a successful planner, but the new jobs asked for a plan it had never produced."
locale: en
date: 2026-11-28
project: auto-coder
slug: the-rerun-without-a-plan
translationKey: the-rerun-without-a-plan
draft: false
---

I opened the failed test shard on [Auto-Coder #2946](https://github.com/outliner-online/auto-coder/pull/2946) expecting an assertion to investigate. The [rerun log](https://github.com/outliner-online/auto-coder/actions/runs/46097318901/job/140837350381) had a more basic complaint. It could not download its test plan. No test in that shard had a chance to fail.

I went back to [the planner log](https://github.com/outliner-online/auto-coder/actions/runs/46097318901/job/140837350248). The upload had succeeded. Reading the two names side by side made the difference clear: the planner uploaded `source-test-plan-46097318901-1`, and the shard requested `source-test-plan-46097318901-2`. The run number matched. The attempt number did not.

## Same run, different attempts

In [the workflow at that revision](https://github.com/outliner-online/auto-coder/blob/7c2bb8e9e81cef914d2153dfc5cfb24b5791c96a/.github/workflows/test-source-for-runtime.yml), the planner partitions the test inventory and uploads a plan named with the run ID and attempt number. The shards download a plan using the same formula. On a complete attempt, producer and consumers use the same number. It is a useful way to keep the plan and execution evidence tied to the right attempt.

A partial rerun changes that relationship. [GitHub documents](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs) that jobs left out of a partial rerun retain their outputs from the previous attempt. Here the successful planner was left alone. The jobs that ran again had attempt number two, but none of them produced an attempt-two plan. The [second attempt](https://github.com/outliner-online/auto-coder/actions/runs/46097318901/attempts/2) therefore could not tell me whether the original test failures would recur.

The [first attempt](https://github.com/outliner-online/auto-coder/actions/runs/46097318901/attempts/1) tells a different story. Its two failed shards got far enough to run tests: [one](https://github.com/outliner-online/auto-coder/actions/runs/46097318901/job/140832192393) reported four failed assertions around older Jules behavior, and [the other](https://github.com/outliner-online/auto-coder/actions/runs/46097318901/job/140832192410) reported a failed startup-recovery test. I kept those results separate from the artifact error. Repairing the missing input would let the tests run again; it would not make their assertions pass.

For this workflow, if the same revision still needs another run, rerunning all jobs gives the planner and its consumers the same new attempt. A workflow designed to support partial reruns would need an explicit way to identify the plan the retained planner actually produced and verify that it matches the checkout and test selection. Falling back to whichever plan happens to be available would make that verification weaker.

By the time I finished checking, the PR had moved to another revision and [a new source run](https://github.com/outliner-online/auto-coder/actions/runs/46099736357) was already underway. I left the old attempt alone. The useful result was a better diagnosis of where it stopped: at a mismatched artifact name, before it could answer anything about the tests.
