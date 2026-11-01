---
title: "When equal test counts made unequal work"
description: "I followed a timeout through the logs, then checked the evidence for a duration-based test split."
date: 2026-11-01
locale: en
project: auto-coder
slug: test-shard-workloads
translationKey: test-shard-workloads
draft: true
---

I had a timeout to investigate, but the last test in the log was not a good place to assign blame. Reading the evidence in [issue #2699](https://github.com/kitamura-tetsuo/auto-coder/issues/2699), I found that tests were still finishing: shard 3 of PR #2671's run reached its 660-second limit with results appearing until roughly 20 milliseconds before the deadline. I wanted to get the work moving again, but calling that last test “hung” would have given me a diagnosis the evidence did not support.

So I looked at what the runner had been asked to finish. Counting tests made the split look fair. Comparing their estimated duration did not. Without a duration file, `pytest-split` 0.11.0 divided the collection into contiguous groups by count; historical estimates put the four workloads at about 108, 160, 524 and 249 seconds. That changed the question I was checking: not just “why did this runner take so long?” but “had we given it much more work than the others?”

The proposed weighted split brought those estimates to roughly 260 seconds each. I could see the appeal, but I still had to keep the estimate separate from a result. These were intervals between logged results, excluding setup—not native pytest phase timings. The PR also reported an earlier full local shard with 72 failures and two skips in a restricted environment. Neither a tidy estimate nor an unsuccessful local run could stand in for a passing CI run. I needed to follow the proposal through to its actual checks.

[Draft PR #2700](https://github.com/kitamura-tetsuo/auto-coder/pull/2700) supplies a versioned snapshot, `tests/data/pr-test-durations.json`, with provenance that can be reviewed alongside the change. I checked the [documented behavior at the reviewed revision](https://github.com/kitamura-tetsuo/auto-coder/blob/5bb60fec936e527285baa4c5f3778e24e2ff6918/docs/client-features/pr-test-duration-balancing.md): the split still has four contiguous groups and preserves order within each group. Both attempts use the same immutable input. Partial CI output does not quietly become the next attempt's timing policy.

That restraint matters because changing the distribution should not weaken the test gate. The selector, complete test set, assertions and failure propagation remain intact. So do the initial 480-second budget, progress-based extension capped at 660 seconds, 180-second idle limit, at most two attempts with retry only on timeout, and 24-minute step limit. The proposal gives each runner a fairer share rather than giving an overloaded runner an indefinitely longer leash.

The input handling needs care too. Invalid, negative, non-finite and duplicate input is rejected; zero durations receive a positive floor. Unknown current tests use the mean of matched current tests, or an equal default when none match, while removed tests are ignored. The tests exercise the real plugin and production collection path, checking that the four disjoint groups preserve the unsplit collection's multiset and order. That is more useful than showing that a small hand-picked list divides neatly.

I kept the reported local results separate from what I could verify in CI. The PR reports 32 focused tests passing and a separate passing check of mypy failure propagation. I did not rerun those tests for this entry, and kept the unsuccessful full local run in view alongside those focused passes.

The stronger evidence is the [PR Tests run on the exact reviewed head](https://github.com/kitamura-tetsuo/auto-coder/actions/runs/41263507963), `5bb60fec`, which succeeded at 02:17:30 UTC on November 1. Its four shard steps took approximately 314, 347, 382 and 455 seconds, including setup and collection. All finished within the initial 480 seconds, without retry. These are actual step durations, so I would not compare them directly with the earlier setup-excluding estimates.

As of 03:03 UTC, the PR was still an open draft, not merged. This successful run supports the proposed split at that revision; it does not apply the change to PR #2671, establish a deployment, or guarantee future timings. For this entry, the useful result is narrower and concrete: the reviewed change kept the test gate intact, and one real CI run finished all four workloads inside the original budget.
