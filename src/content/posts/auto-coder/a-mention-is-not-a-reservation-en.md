---
title: "A mention is not a reservation"
description: "Reviewing an Auto-Coder change showed why an Issue reference can be useful context without giving a pull request an implementation slot."
date: "2026-11-21"
locale: en
project: auto-coder
slug: a-mention-is-not-a-reservation
translationKey: a-mention-is-not-a-reservation
draft: false
---

When I reviewed [Auto-Coder #2864](https://github.com/outliner-online/auto-coder/pull/2864), I checked what happened to one awkward reference: `Closes #5459example`. A parser that stops reading at the last digit sees Issue 5459. But the text hasn't finished the reference there. In [my review of commit `6c93cdb`](https://github.com/outliner-online/auto-coder/pull/2864#pullrequestreview-6002019255), I verified that a word suffix like that no longer gave the PR ownership of the Issue. A valid reference followed by whitespace or punctuation still worked. The regression tests exercised both ordinary routing and startup against the actual slot store, not just a standalone parser.

There was a less contrived version of the same problem. The author of #2864 reported that an Outliner draft mentioned a closed Issue and its existing requirements to explain what the draft was *not* changing. Auto-Coder read that as an ownership signal, and the PR took an implementation slot. The reference was useful to a reviewer. The mistake was letting it count as an instruction to the scheduler.

## What the prose can say

[The ownership rule](https://github.com/outliner-online/auto-coder/issues/1989) keeps these uses separate. Review can still use references for context. To establish ownership from the PR body, the [proposed change](https://github.com/outliner-online/auto-coder/pull/2864/files) looks for a genuine closing directive in the author's prose. A directive shown as an example in a blockquote or code block doesn't count. Nor does a partial match on an Issue number. Other established evidence, such as a recorded implementation membership, keeps its authority.

That distinction matters at startup, too. If discovery turns a casual mention into a saved membership, the next pass can see a durable record rather than the ambiguous text that produced it. The proposed fix applies the same restricted parser there. It doesn't go back and remove historical associations: the stored record doesn't tell the system which memberships came from prose and which were established legitimately.

## A draft can exist without a slot

There's another boundary in the same change. For a fresh autonomous draft without a configured local repair backend, the proposal checks whether there is a usable provider route before creating a reservation. If the route is blocked or the evidence is uncertain, admission is deferred rather than taking a slot first. That's a check on new work, not a reason to evict work whose ownership has already been established.

At the time of writing, #2864 is open. My review spoke to the changed ownership boundary at the commit I checked. It didn't verify a rollout or the recovery of any historical record. The rule I'd keep from the review is simpler than the implementation: a cross-reference tells me what to read; it doesn't tell the scheduler what to reserve.
