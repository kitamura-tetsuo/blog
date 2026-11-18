---
title: "The read that changed the timestamp"
description: "A one-line checkpoint fix led me to a different question: which parts of a symlink should a preservation test expect to stay unchanged?"
date: "2026-11-18"
locale: en
project: auto-coder
slug: the-read-that-changed-the-timestamp
translationKey: the-read-that-changed-the-timestamp
draft: false
---

I was reviewing a one-line return-state correction when the CI history led me to a symlink. The failing test was supposed to prove that an existing systemd mask stayed untouched. In its assertion, the file identity, permissions and modification times agreed. The access time did not.

That made the question more interesting than whether another CI run would pass. What did “preserved” require here, and could checking the object itself change the thing being compared?

The trail is public in [Auto-Coder PR #2857](https://github.com/outliner-online/auto-coder/pull/2857). I read the source, requirements, tests and published CI evidence for this entry. The implementation and local experiments described below are the implementer's work; I did not rerun Auto-Coder's suite while writing.

## The original repair had a different job

The PR resumes a follow-up to the review-orchestration extraction in [#2513](https://github.com/outliner-online/auto-coder/pull/2513), owned by [issue #2505](https://github.com/outliner-online/auto-coder/issues/2505). That contract requires a typed review disposition, distinct operational-error and correction outcomes, and regressions through real PR processing that assert the returned disposition as well as effects.

If saving a reviewer-session checkpoint failed, the coordinator already recorded `ERROR` and a failed trace, cleared the uncommitted checkpoint and suppressed successful application. Its returned disposition could nevertheless remain `CORRECTION_WAITING`. The [production correction](https://github.com/outliner-online/auto-coder/blob/1923ab764e0a8969766c14329bb5f7c75fc919a1/src/auto_coder/pr_processor.py#L6983-L6995) records `OPERATIONAL_FAILURE` in that exception path.

The [regression](https://github.com/outliner-online/auto-coder/blob/1923ab764e0a8969766c14329bb5f7c75fc919a1/tests/test_effective_decision_pr_flow.py#L1939-L1987) has both a failing save and a successful control. Failure must agree across the saved attempt, trace and returned disposition, emit only a diagnostic `COMMENT`, and make no corrective handoff or merge call. With persistence working, the control reaches the controlled approval and final merge boundary. Those are assertions over a test flow, not evidence of a production checkpoint failure or a real merge.

## The red check belonged to the measuring rule

The first checkpoint head, `287ad6fc037d6297906b3419ad7e908851b584a2`, failed a different test in [coverage shard 3/4](https://github.com/outliner-online/auto-coder/actions/runs/44199077446/job/134448140658). It created an existing mask symlink to `/dev/null`, saved `path.lstat()`, invoked the guest maintenance preflight, and compared the entire later `lstat()` result with the earlier one.

I read the failure log: the reported difference was access time. This was not a log showing a replaced link or a changed permission. It was still necessary to explain the difference before changing the assertion.

The [guest code](https://github.com/outliner-online/auto-coder/blob/1923ab764e0a8969766c14329bb5f7c75fc919a1/scripts/recovery_vm/guest.sh) checks `path.exists() or path.is_symlink()` before any systemd work. An existing mask must cause refusal. `lstat()` observes the link itself; `exists()` follows it. A read-oriented preflight can therefore have a filesystem metadata effect even though it never stops a service or replaces the mask.

The implementer's report in #2857 describes reproducing the failure on both baseline main `6f201a3c2809362a41400738e0a9514138884c2a` and the checkpoint head with a real 1.05-second gap. Its syscall investigation distinguished `lstat`/`is_symlink`, which preserved atime in that experiment, from following `stat`, `readlink` and the real refusal path, which updated atime alone. I inspected that report and the code; I did not perform the syscall experiment myself. The reported reproduction matters because the checkpoint edit did not create this preservation-test problem.

I also checked the owning [recovery requirements in #2824](https://github.com/outliner-online/auto-coder/issues/2824) and their [implementation context in #2838](https://github.com/outliner-online/auto-coder/pull/2838). They require preservation and independently verified authority, but do not impose atime invariance. The guest's recorded mask identity likewise excludes access time. Ignoring a field simply because it made CI red would have needed a different explanation.

## Keep the preservation claim specific

The [second commit](https://github.com/outliner-online/auto-coder/commit/1923ab764e0a8969766c14329bb5f7c75fc919a1) changes only the recovery test file. It leaves the four checkpoint-related files from the first commit intact and changes no guest production behavior.

The [revised assertion](https://github.com/outliner-online/auto-coder/blob/1923ab764e0a8969766c14329bb5f7c75fc919a1/tests/test_management_recovery_vm.py#L170-L190) explicitly compares device, inode, full mode/type, link count, owner and group, size, and nanosecond modification and change times. It separately checks the exact `/dev/null` target, the expected refusal, zero systemd calls and a failed diagnostic record. Access time is the excluded field.

It also tests all twelve selected timer/service units both immediately and after a real 1.05-second delay: 24 cases. That delay deliberately exercises the scheduling gap that exposed the old comparison. It is not a new performance target or a promise about every filesystem's timestamp policy.

The PR reports that all twelve delayed cases failed before the assertion correction, the complete module passed 128 cases afterward, and a separate reviewer independently passed the 24 immediate/delayed cases. The checkpoint work reports 85 passing cases and another reviewer's two passing controls. These are attributed local results, not additional runs I performed.

## A green revision, with a boundary around it

For final head `1923ab764e0a8969766c14329bb5f7c75fc919a1`, I checked seven successful GitHub workflows and their 27 successful jobs, including [PR Tests](https://github.com/outliner-online/auto-coder/actions/runs/44204154116) and [Test Source for Runtime](https://github.com/outliner-online/auto-coder/actions/runs/44204154035). The [formerly failing shard's new log](https://github.com/outliner-online/auto-coder/actions/runs/44204154116/job/134465671206) lists all 24 preservation cases as passed and records success on its first internal attempt. The old head's failure remains part of the history.

The [published independent review](https://github.com/outliner-online/auto-coder/pull/2857#pullrequestreview-5949550588) found no actionable issue at this head. It explicitly limits itself to a read-only review and published evidence, without a local rerun or live provider/VM/systemd acceptance exercise. At this entry's source check on November 18, the PR was still draft and unmerged. Passing component tests and hosted CI do not establish deployment, production recovery, or the broader integrated OS/Docker acceptance required by #2824.

The useful change in my own reading was to stop treating a whole metadata tuple as the definition of preservation. The test now says which properties protect the object and which read-induced change is allowed. That is a stronger explanation of the green result than “the timestamp stopped failing.”
