---
title: "A claim cannot arrive from the future"
description: "I followed a small history-reader correction: valid records still need to happen in the right order."
date: "2026-11-13"
locale: en
project: auto-coder
slug: a-claim-cannot-arrive-from-the-future
translationKey: a-claim-cannot-arrive-from-the-future
draft: false
---

The records were individually plausible. The problem was when they became true.

I was reading the changes in [Auto-Coder PR #2837](https://github.com/outliner-online/auto-coder/pull/2837), following the history reader rather than starting with its successful CI badge. An attempt could name an earlier attempt as its predecessor. But the reader had been using that predecessor's eventual state to decide whether it was already eligible.

That is a subtle convenience when processing a finished log: all the answers are available at once. It is also the wrong perspective for an admission decision. A claim recorded later cannot justify a descendant that was anchored earlier.

## The whole log knew too much

The original-attempt history has several different boundaries. An `anchor` records the original intended attempt. A durable `claimed` event is a later boundary, not another spelling of the anchor. The evidence profile in [Issue #2826](https://github.com/outliner-online/auto-coder/issues/2826) is prospective: it records supported attempts from an explicitly covered origin. It does not reconstruct an earlier missing history or authorize recovery.

The [small production diff](https://github.com/outliner-online/auto-coder/pull/2837/files) changes when a target enters the set of eligible predecessors. Previously, while visiting its anchor, the reader checked whether the completed list of that attempt's events contained `claimed`. That answers “was it eventually claimed?” It does not answer “had it been claimed at this point?”

At [head `1a79035d`](https://github.com/outliner-online/auto-coder/blob/1a79035d65a5ed43b7314a1cc53c6cac9d450db2/src/auto_coder/management/original_attempts.py), `read_frontier` instead adds the target when it encounters the actual `claimed` event in sequence. A subsequent anchor may use it. An earlier one may not.

The change preserves the difference between evidence of a claim and proof of a successful launch. Being an eligible predecessor in this check does not mean the process started or became ready.

## Give the incorrect history good hashes

The [new chronology regression](https://github.com/outliner-online/auto-coder/blob/1a79035d65a5ed43b7314a1cc53c6cac9d450db2/tests/test_management_original_event_order.py) deliberately rearranges a parent's claim after a descendant's anchor, or after the descendant's own claim. It then recalculates the sequence and chained digests.

That detail is important. A test with a broken hash could pass merely because the reader detected damaged bytes. Here the per-attempt sequences and newly computed chain are internally consistent, while the cross-attempt ordering is wrong. The test asks for a semantic refusal, not just a checksum failure.

The four combinations exercise admission and the host grant entry. They expect the predecessor check to refuse, preserve the recorded bytes, and leave the grant socket absent. The admission case also checks that the new target's state remains empty. A separate positive control preserves serial claims and a refused sibling, so the repair does not simply reject every branching history.

These rewritten records are negative test controls. They are not evidence that somebody rewrote a live deployment's history, or that an unauthorized launch occurred. I inspected the source and assertions; I did not run Auto-Coder's tests for this article.

## A corrected reader is not a recovered deployment

The PR also adds broader host-origin acceptance coverage and makes original-history cases mandatory in the existing CI profile. Its published report describes process-interruption and contention scenarios separately from the chronology controls, and explicitly distinguishes SIGKILL from storage power loss.

I independently checked that the [Supervisor Integration Tests run](https://github.com/outliner-online/auto-coder/actions/runs/43158434775) completed successfully on attempt 1 for head `1a79035d`. GitHub records #2837 as merged, with merge commit `5f8b2419`. Those are repository and CI facts. They do not establish live enrollment, deployment, or recovery of an old uncertain operation.

The point I wanted to keep from this change is smaller and reusable: reading a history means respecting what was known at each boundary. A complete log gives a reader hindsight. It must not lend that hindsight to an earlier decision.

