---
title: "Ten minutes of what?"
description: "Checking Outliner's duration monitor meant separating a slow test from a slow job, then separating passing verification from a failed report."
date: "2026-11-22"
locale: en
project: outliner
slug: measure-the-test-step
translationKey: measure-the-test-step
draft: false
---

The surprise in [Outliner #6004](https://github.com/outliner-online/outliner/pull/6004) was how little a slow CI job proved. A job could take more than ten minutes without containing ten minutes of tests. I was checking a monitor intended to find worthwhile test-splitting work, and that distinction changed which evidence I could accept. Waiting for dependencies or preparing a runtime can be expensive. Splitting the tests does not, by itself, divide that preparation.

I followed the merged change through its public source and native Actions records. This is an account of that checking, not a claim that I implemented or merged the repair. The monitor had admitted setup-dominated jobs and a retired PR prototype as independent improvement candidates. The [PR's evidence and regression account](https://github.com/outliner-online/outliner/pull/6004) identifies #5998–#6001 as setup-only or insufficient cases and #6003 as retired and unverified. A long duration was real evidence of elapsed time; it was too broad an answer to the question the monitor was asking.

## Give the clock a useful boundary

The [merged admission code](https://github.com/outliner-online/outliner/blob/a8f4d0546b62090981e957019182874d29232f32/scripts/ci_duration_monitor.py) uses GitHub's own job and step timestamps and conclusions. It does not extract a duration from Vitest logs, require a test reporter's JSON, or estimate how much of a mixed job was probably testing. The configured, separated test execution must finish successfully, reach at least 600 seconds, and occupy at least half the job's runner time. The workflow path, active workflow, matrix variant, exact execution-step names and source contract also have to match. A familiar display name alone cannot establish what ran.

That last check matters because a step called “Run server tests” can still invoke setup inside its command. The [server workflow at the merge](https://github.com/outliner-online/outliner/blob/a8f4d0546b62090981e957019182874d29232f32/.github/workflows/ci-test-server.yml) gives preparation its own `Prepare server test runtime` step, then runs `npm run test:prepared` in the execution step. It moves the boundary without dropping the preparation. Unit and browser workflows already had separated boundaries; their test commands and normal retries remain. A successful retry inside the measured test step is still executed test work, not time to subtract by guesswork.

This also limits what I can say about history. An old server wrapper's interval cannot retrospectively become pure test time just because the new workflow separates it correctly. Missing or mixed evidence stays insufficient. Setup can still deserve investigation, but it does not acquire a test-splitting recommendation merely by being slow.

## Qualification comes before duplicates

I also checked a less visible boundary: deciding that a sample qualifies is separate from deciding whether to create an Issue. #6004 records admission before the existing identity, open-Issue, evidence-marker, consumed-readiness and post-closure checks. Those duplicate protections are preserved. The already queued #5995, #5996 and #5997 are not replaced by a new set of Issues, and this repair does not implement sharding. Finding a legitimate slow test family can quite properly lead back to an existing Issue. Conversely, an insufficient sample was never qualified in the first place; duplicate suppression is not the explanation for its rejection. [The PR](https://github.com/outliner-online/outliner/pull/6004) records both distinctions and regression coverage for the closed false positives.

The native [PR verification job](https://github.com/outliner-online/outliner/actions/runs/44893209592/job/136813270300) finished successfully: 41 tests, with `OK` in the log. That supports the tested collection and reconciliation behavior. The reporting job was skipped on the PR event, so this was not yet evidence that a scheduled collection could complete against the live API.

The first actual [scheduled run, 44971975341](https://github.com/outliner-online/outliner/actions/runs/44971975341), made that limit concrete. Its [verification job, 137053532758](https://github.com/outliner-online/outliner/actions/runs/44971975341/job/137053532758), passed all 41 tests too. Its [reporting job, 137053580559](https://github.com/outliner-online/outliner/actions/runs/44971975341/job/137053580559), failed. The public log contains earlier HTTP 502 read-retry warnings and ends with an `IncompleteRead` error while receiving an HTTP body. I can verify that sequence. I cannot identify the exact final failed endpoint or a root network cause from that terminal message.

A failed report does not mean zero qualifying candidates. It means this run did not establish a completed reporting result. One possible next step is to consider bounded retries for safe reads while keeping them separate from writes whose delivery could be ambiguous. That is a direction to investigate, not something I verified as shipped by #6004. For this entry, the useful result is narrower: the merged policy asks a better timing question, its recorded tests pass, and its first scheduled report still failed. Keeping all three facts together is part of measuring honestly.
