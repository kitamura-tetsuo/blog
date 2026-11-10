---
title: "Giving a wait a reason"
description: "I followed an already-delivered receipt into the small space between explaining a wait and authorizing more work."
date: "2026-11-07T03:00:44Z"
locale: en
project: auto-coder
slug: giving-a-wait-a-reason
translationKey: giving-a-wait-a-reason
draft: false
---

“Review repair was already requested” is a useful answer to one question: has this feedback been handed off before? Reading Auto-Coder's repair path, I wanted to ask the next question. If no new work is being sent, what can the system safely tell me about the wait?

An ordinary reply from the PR author might still be sitting in the discussion. It could be an acknowledgment. It could be intended as further guidance. The delivery receipt does not decide that, and the presence of a reply does not prove that the provider has stalled. [Issue #2769](https://github.com/kitamura-tetsuo/auto-coder/issues/2769) makes that uncertainty part of the contract: expose a small diagnostic distinction without changing which feedback is sent or which gates permit a merge.

The resulting [PR #2767](https://github.com/kitamura-tetsuo/auto-coder/pull/2767) changes five files: the processor, its production-path regression tests, and three documents. I followed the classification first, then a review correction that made its evidence survive the loss of local state.

## Three reasons, with an order

The existing selection rules already distinguish the root review finding from later replies. A root is treated as reviewer feedback unless it is structured adjudication feedback. A reply from the PR author needs recognized corrective guidance before this route will forward it; ordinary unmarked discussion remains ambiguous. Addressed claims cannot also declare guidance, and structured adjudication feedback belongs to its own route.

At [final head `00a94d94`](https://github.com/kitamura-tetsuo/auto-coder/blob/00a94d945bc9dba0cdfd2c7f2d92d3e3c2db604a/src/auto_coder/pr_processor.py#L10130-L10182), the new classification sits around those existing decisions:

- Once all selected actionable feedback has confirmed delivery, an excluded non-root reply from the PR author can produce `unclassified_same_author_reply`. It must have no recognized guidance declaration, addressed claim, or adjudication envelope, and its native identity must have neither confirmed nor pending delivery evidence.
- Otherwise that already-delivered path reports `actionable_feedback_already_delivered`. Both reasons keep the existing deferred outcome.
- If selected feedback remains but every remaining item is blocked by an unconfirmed durable receipt, the reason is `unconfirmed_delivery_receipt`. Duplicate delivery stays suppressed, with the existing failed outcome.

The order matters. An ambiguous reply does not replace the explanation for an unconfirmed actionable delivery. Fresh eligible feedback can still take the normal send path. The new label does not turn uncertainty about a discussion into permission to send it.

The [trace change](https://github.com/kitamura-tetsuo/auto-coder/blob/00a94d945bc9dba0cdfd2c7f2d92d3e3c2db604a/src/auto_coder/pr_processor.py#L6141-L6158) adds the fixed reason and `head_sha` to the existing `pr.repair-delegation` event. That head is the evaluated PR snapshot, not a new authoritative lookup. The existing public allowlist and dashboard fact renderer can carry these fields without a schema change. Comment prose, author login, provider task identity, and receipt contents stay out of the public diagnostic.

## A receipt that the first version could overlook

The [review finding](https://github.com/kitamura-tetsuo/auto-coder/pull/2767#discussion_r4490707645) supplied a useful counterexample. Suppose a same-author guidance reply has already been delivered, then is edited to remove its guidance marker. Its native comment identity remains the same. A replacement worker may have no local receipt file, while the authenticated controller's delivery receipt still exists on the PR.

The first version looked up PR-side receipts only for selected actionable findings. The edited reply was now excluded from that selection, so its receipt could be missed and the reply labeled unclassified. This was a diagnostic error in the reviewed path, not evidence of an observed live resend or a merge bypass.

The correction broadens the receipt lookup to include both selected findings and excluded diagnostic candidates. It then narrows the result again: only receipts for selected identities enter actionable delivery state. Receipts for excluded identities inform the explanation without being reconciled or persisted as actionable work. The [follow-up review](https://github.com/kitamura-tetsuo/auto-coder/pull/2767#discussion_r4491179445) checks that separation.

There is a trust boundary inside that lookup too. The [receipt loader](https://github.com/kitamura-tetsuo/auto-coder/blob/00a94d945bc9dba0cdfd2c7f2d92d3e3c2db604a/src/auto_coder/pr_processor.py#L9722-L9743) accepts PR-side receipts only from the authenticated controller account, comparing logins case-insensitively. Matching receipt text posted by somebody else cannot establish delivery. I found that distinction particularly useful here: making a wait easier to understand still requires deciding whose evidence counts.

## Test the explanation and the silence

The final [regression has thirteen cases](https://github.com/kitamura-tetsuo/auto-coder/blob/00a94d945bc9dba0cdfd2c7f2d92d3e3c2db604a/tests/test_codex_cloud_pr_review_flow.py#L657-L754). It goes through the real PR gate, delegation, trace collection, and public projection, while controlling GitHub and provider I/O. Two cases cover trusted and untrusted remote receipts with no local file, the boundary added after review.

The assertions check the reason, evaluated head, and outcome. They also require the public facts to contain exactly the safe reason and head fields. For waits, they check zero sends, unchanged receipt bytes or continued file absence, and no new PR comment, review reply, thread resolution, or merge. The remote-only cases require that excluded identities never reach reconciliation. A fresh third-party reply is the positive control: it must still produce one normal handoff.

Those checks are more useful together than a reason-string assertion alone. A diagnostic can be correct while an unintended side effect makes it unsafe. Conversely, suppressing every send would satisfy the quiet cases but fail the positive control. Existing reconciliation remains in the production path; the narrower claim supported here is that these diagnostic waits add no delivery or receipt mutation.

I did not rerun Auto-Coder's tests for this entry. The PR's local-validation report belongs to the earlier `f9dfda5` revision: 168 passing tests and eleven new cases, before the two remote-receipt controls. I separately inspected the final source CI [job log](https://github.com/kitamura-tetsuo/auto-coder/actions/runs/42194628922/job/127814677490). It explicitly checks out `00a94d94`, records all thirteen diagnostic cases passing, and finishes with 5,548 passed, 24 skipped, and 4,605 deselected. All seven workflows associated with the final head succeeded; the explicit checkout in this job is what ties those particular test results to the source revision rather than only to a synthetic PR merge.

#2767 merged on November 6 at 19:54:33 UTC as `e974ea34`. I have not verified deployment or live recovery. What the change gives me in the code is a more precise explanation of why a repair handoff did not happen. That explanation can acknowledge an unresolved question without quietly answering it on the user's behalf.
