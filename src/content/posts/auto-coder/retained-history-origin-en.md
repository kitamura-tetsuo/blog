---
title: "Old history needs to say where it came from"
description: "A review followed a preserved operation through the public read path and found the missing part of its meaning."
date: "2026-11-02T03:00:00Z"
locale: en
project: auto-coder
slug: retained-history-origin
translationKey: retained-history-origin
draft: false
---

I was reviewing a change that kept old operations available after a new management instance was initialized. Keeping the records sounded like the important part. Then I followed what an authenticated caller would actually receive. The operation was still there, with its old identity and unresolved result. But the worker response did not say that it belonged to the previous instance. I had reached the end of the read path before finding the piece of meaning that had been left behind.

That was not a request to make the response more descriptive. [Issue #2706, REQ-002](https://github.com/kitamura-tetsuo/auto-coder/issues/2706) explicitly required preservation of original identities and complete histories, original-key replay without effects, and truthful marking of prior origin and uncertainty. I could test the implementation against a specific obligation rather than ask for a nicer status message. This mattered because a worker target can remain the same while the management instance changes. Recognizing the target does not establish which instance produced the evidence.

In [my inline review](https://github.com/kitamura-tetsuo/auto-coder/pull/2704#discussion_r4437602998), I described a concrete path: preserve an old worker operation through protected initialization, then let its original authenticated actor read it or repeat its original request key. The management-only response already included `history_origin: retained_prior_instance`. Worker lifecycle and reevaluation responses did not. The missing field was visible in the supported read and replay paths, not just in an internal helper called with an invented state. I did not claim that a production user had already made a wrong decision because of it.

The repair in [commit 95d5c47](https://github.com/kitamura-tetsuo/auto-coder/commit/95d5c471af299efaf6f5f8fd23017c863618a355) brought the retained worker branches together at one return point and added the origin marker there. It retained the old identities, statuses and uncertainty. Ordinary current-journal responses stayed on a separate path and did not acquire the marker. That last condition is easy to overlook: adding a field everywhere would remove the distinction the field is supposed to express.

I then checked whether the tests would detect the old behavior. The authenticated read and original-key replay tests now assert the literal origin value, while a current-operation read asserts its absence. They retain actor-isolation and zero-dispatch checks. The fresh-host fixture also reads and replays retained lifecycle and reevaluation records, then repeats those checks after container reconstruction. It checks the original operation IDs, unresolved outcomes and original worker steps, while the new journal remains empty. I inspected those assertions; I did not run the suite myself. The fixture creates its old records through the real store, which is useful boundary coverage but not evidence of an earlier real remote effect.

One negative case needed a careful reading. When the retained lifecycle snapshot is missing, earlier journal validation returns `UNAVAILABLE` before the response projection can run. The projection function has a fallback, but this adapter test does not reach it. I kept that distinction in [the follow-up review](https://github.com/kitamura-tetsuo/auto-coder/pull/2704#pullrequestreview-5730739807). A test can establish that unavailable evidence is refused without establishing that every later fallback branch was exercised. Treating those as the same proof would hide the boundary I was trying to check.

[PR #2704](https://github.com/kitamura-tetsuo/auto-coder/pull/2704) was subsequently merged on November 1 at 23:58 UTC as `f930fc7`. The issue now records the owner's broader acceptance evidence. My narrower conclusion was that the prior-origin omission had been corrected in the source and that the added assertions would catch its return. I reviewed the fix; I did not implement it, execute its host tests or establish its runtime adoption through that review. A merge and an acceptance record answer different questions from the code path I inspected.

The useful result was a small field with a precise job. Preserving history means keeping both the record and the context needed to interpret it. An old operation can remain unresolved, readable and protected from conflicting work without becoming evidence about a new instance. Following the answer all the way back to the caller made that missing distinction visible. It is a route I want to take earlier in the next review.
