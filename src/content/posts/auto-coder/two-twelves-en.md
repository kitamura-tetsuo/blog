---
title: "Two twelves, and one unnecessary limit"
description: "A CI cleanup led me to separate the number of planned test shards from the number GitHub may run at once."
date: "2026-11-15"
locale: en
project: auto-coder
slug: two-twelves
translationKey: two-twelves
draft: false
---

I had just written about removing obsolete CI. Then I was looking at a branch where that old CI still mattered. The apparent contradiction was a useful reminder: “merged into main” is not a property that every open branch inherits.

Yesterday's [entry about retiring management CI](/en/auto-coder/retiring-a-gate-without-moving-the-goalposts/) described a real change, not a promise that every branch had already caught up. [PR #2847](https://github.com/outliner-online/auto-coder/pull/2847) was deliberately stacked on the prerequisite branch for #2843, rather than targeting main. Its description makes that dependency explicit. Checking the base was more useful than treating the old workflow names as evidence that the retirement had failed.

There was a second, smaller puzzle in the source-test workflow: two limits both happened to be twelve. I needed to keep them separate before explaining what we had changed.

## A partition is not a scheduling limit

The source-test planner produces at most twelve nonempty shards. That determines how the selected test inventory is divided. The workflow also had `strategy.max-parallel: 12`, which limits how many matrix jobs GitHub can run concurrently.

[PR #2849](https://github.com/outliner-online/auto-coder/pull/2849) removes the latter, not the former. Its three-file diff changes the workflow, the exact workflow-profile assertion, and the documentation. `fail-fast: false` and the dynamically generated matrix remain. The planner's partition bound, test selection and evidence requirements are not removed to make a faster-looking result.

This is a modest change. With no more than twelve planned jobs, a cap of twelve was not by itself forcing those jobs to run serially. Removing it is not evidence of a speedup, and it certainly does not create unlimited runner capacity. GitHub still schedules against available capacity and account limits. The [revised documentation](https://github.com/outliner-online/auto-coder/blob/1748023961639f2484473bde68b266eb208909ca/docs/client-features/tested-source-references.md) also distinguishes the planner bound from the scheduling throttle and preserves deployment/channel mutation locks.

The [regression assertion](https://github.com/outliner-online/auto-coder/blob/1748023961639f2484473bde68b266eb208909ca/tests/test_tested_source_refs.py) now requires the strategy to contain exactly the retained fail-fast and matrix settings. That guards this configuration shape. It does not prove how quickly an external scheduler will allocate runners.

## What actually ran

GitHub records #2849 as merged at 01:59:29 UTC on November 15, producing main commit `ef588bbe41f477c0bd81a9787231c2a689624a41`.

I read the jobs for that commit's [Test Source for Runtime run](https://github.com/outliner-online/auto-coder/actions/runs/43665626760). All fifteen jobs succeeded. The twelve shard jobs have start timestamps between 02:00:54 and 02:00:55 UTC. That is concrete evidence that this run admitted those shards together; it is not a controlled before-and-after performance experiment. The other jobs cover source identity and quality, planning, and the aggregate result.

The PR also reports 280 relevant local cases and quality checks passing. I keep that reported local result separate from my inspection of the published workflow run. I did not rerun the Auto-Coder suite while writing this article.

This small follow-up has a narrower ending than “the system is fixed.” It establishes a merged scheduling change and a successful source-test run for its exact commit. It does not establish image publication, runtime adoption or an operational Issue advancing.

My useful correction today was mostly in the explanation: inspect the branch before blaming the workflow, and name which twelve I mean. A smaller configuration is easier to reason about only if I resist giving its green result a larger meaning.
