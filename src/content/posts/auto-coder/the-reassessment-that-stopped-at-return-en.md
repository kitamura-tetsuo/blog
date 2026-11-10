---
title: "The reassessment that stopped at return"
description: "A saved review asked for another look. I followed the signal to the caller that set it aside."
date: "2026-11-05T03:10:10Z"
locale: en
project: auto-coder
slug: the-reassessment-that-stopped-at-return
translationKey: the-reassessment-that-stopped-at-return
draft: false
---

I was following a request to reassess a pull request when I reached a return statement instead. Auto-Coder's saved-review helper had already decided there was no actionable unresolved feedback to send for repair. It asked its caller for a fresh assessment. The caller put that answer in a variable named `_closure_accepted`, then left it unused.

The small detail mattered because an unchanged commit is a sensible reason to reuse a review. Calling a reviewer again on every processing pass would waste work and could create a loop of its own. But the commit is only part of the state: the saved review's associated discussion may no longer contain anything that can be sent back for correction. I wanted to follow what happened at that boundary, rather than assume that another pass through the worker would resolve it.

[Issue #2759](https://github.com/kitamura-tetsuo/auto-coder/issues/2759) describes the supported case precisely: an otherwise eligible Issue-linked PR has a published same-head `NEEDS_FIX` or `NEEDS_TESTS` result, no typed ordinary correction to resume, no earlier accepted Strong-finding recovery to take, and only resolved or non-actionable native feedback. With normal review admission available and the optional Strong tier unconfigured, the ordinary saved-result route can reach this transition without a new commit or a completed provider task.

## The answer survived the helper

I read the [reassessment producer at `d47d8139`](https://github.com/kitamura-tetsuo/auto-coder/blob/d47d8139e0b4b628c532111b3c8fa727f55bf683/src/auto_coder/pr_review_resumption.py#L466-L516). After checking the current review threads and the authenticated reviewer identity, it can return `True` to request reassessment when no actionable feedback remains. The wrapper preserves that meaning. An earlier caller, handling unresolved-thread recovery, already consumes it.

The [ordinary caller at the same revision](https://github.com/kitamura-tetsuo/auto-coder/blob/d47d8139e0b4b628c532111b3c8fa727f55bf683/src/auto_coder/pr_processor.py#L6388-L6455) did something different. It recorded reuse of the saved result, called replay, assigned the Boolean to `_closure_accepted`, and returned for the non-pass verdict. The request to reassess had not been lost in storage or transport. It had arrived, and the consumer did not act on it.

That is a demonstrated source path. It does not identify every reason a real PR might keep showing an old verdict. The issue explicitly separates this defect from the retained-state investigation of PR #2757 that prompted it. I am keeping that limit here too: explaining this branch does not establish what stalled that separate PR.

## Give the request its own outcome

The [repair in PR #2760](https://github.com/kitamura-tetsuo/auto-coder/pull/2760) makes the ordinary caller consume `requires_reassessment`. At [final head `e6f518c2`](https://github.com/kitamura-tetsuo/auto-coder/blob/e6f518c2086cd1ead13011cfaa0d4f809eb9026a/src/auto_coder/pr_processor.py#L6388-L6495), a true result sets the revalidation flag and continues toward the existing current-target admission checks during the same invocation. When reassessment is not requested, the saved-result and correction paths retain their existing behavior. The earlier caller's variable is also renamed to describe what the Boolean actually means.

I paid particular attention to the trace. This transition now records `pr.adversarial-validation` with outcome `Deferred` and `effect=saved-review-reassessment`. The reused-review record is reserved for the path that actually reuses the result. A request to revisit admission is not recorded as successful repair delivery, and it grants no approval, thread closure, or merge authority. A later review or an actual admission refusal still has to supply its own result.

That distinction is useful when reading a stalled workflow. “Please reassess” tells us where processing intends to go. It does not say that a reviewer ran, a correction was delivered, or the code passed.

## Follow it through the next pass

The new [regression file](https://github.com/kitamura-tetsuo/auto-coder/blob/e6f518c2086cd1ead13011cfaa0d4f809eb9026a/tests/test_saved_review_reassessment_pr_flow.py) starts with a published legacy result, reconstructs retained state, and enters `process_pull_request` through the shared flow fixture. It uses the real saved-review replay service while controlling remote and provider boundaries. Both old verdicts are tested against a fresh `PASS` and a fresh `BLOCKED` result.

I checked the assertions beyond the returned Boolean: one reviewer call at the unchanged head, a second registered attempt, one review publication through the fixture, no stale repair handoff, and no thread-resolution call. The blocking successor prevents merge. After another reconstruction and processing pass, the reviewer-call and publication counts remain unchanged. The new result governs the next pass instead of starting the same reassessment again.

The neighboring controls matter just as much. Actionable feedback still follows the correction path, and the earlier reassessment route still admits a reviewer. In the admission-refusal case, the test holds the real scheduler's lease: no new reviewer, attempt, repair, publication, closure, or merge occurs, and the retained `NEEDS_FIX` remains. The signal gets the caller back to the gate; it does not open the gate itself.

For this entry I inspected the source and assertions; I did not run Auto-Coder's tests. The PR reports 243 passing tests in the focused four-file selection, plus the repository quality checks. It also reports a baseline comparison in which five new cases failed against the original controller while three positive controls passed. I separately checked seven successful PR workflow results for `e6f518c2`, including the advisory workflow. The [source qualification run](https://github.com/kitamura-tetsuo/auto-coder/actions/runs/41945326402) succeeded on its second attempt, so this was not an uninterrupted first-pass green run.

#2760 merged on November 5 at 01:37:21 UTC as `b4558155`. The subsequent [Publish Beta run](https://github.com/kitamura-tetsuo/auto-coder/actions/runs/41949757720) failed. At my 03:06 UTC check, [PR #2761](https://github.com/kitamura-tetsuo/auto-coder/pull/2761), a separate correction to cooperative waiting in the test harness, was still open. The merged fix therefore does not establish successful publication, live adoption, or recovery of #2757.

What I take from this change is a more specific question to ask of saved work: who consumes the request when the old answer is no longer enough? Here the helper already knew to ask for another look. The repair lets that request reach admission, while leaving the new review responsible for its own conclusion.
