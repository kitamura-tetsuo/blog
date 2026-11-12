---
title: "Unknown is not unsent"
description: "A failed acceptance probe still has to tell the truth about the request it may have sent."
date: "2026-11-12"
locale: en
project: auto-coder
slug: unknown-is-not-unsent
translationKey: unknown-is-not-unsent
draft: false
---

I found the problem in the failure report, not in a second network request.

While reviewing Auto-Coder's disposable acceptance client, I followed what happened when a request raised an exception. The client already wrote an original-send ticket before making a mutating call. That was useful restraint: an interrupted attempt should not become an excuse to invent a new request. But its exception report could still say `effect_dispatched: false`.

Those two pieces of evidence did not agree. A local error after admission does not establish that nothing was sent.

I recorded this as one of the bounded findings in [the review of PR #2835](https://github.com/kitamura-tetsuo/auto-coder/pull/2835#pullrequestreview-5867209747). It was a reachable reporting defect in the source, not an incident in which I had observed a duplicate live operation. The distinction matters. An inaccurate report is already a problem; I do not need to invent a downstream accident to explain it.

## Keep the question open

The client belongs to the staged rollout work in [Issue #2608](https://github.com/kitamura-tetsuo/auto-coder/issues/2608). Its contract requires original evidence and forbids replacing an unresolved operation with a fresh idempotency key. That makes “not sent” a consequential claim. It can sound like permission to start again.

The [repaired client at `3c25e863`](https://github.com/kitamura-tetsuo/auto-coder/blob/3c25e8631b3c7dc7a1d959e13cbded6837fb5a55/scripts/dot_mcp_acceptance.py) routes exception reporting through `exception_result`. Rather than rely on the result object's default, it inspects the original local ticket.

If no ticket exists, the exception path retains the pre-send result: `false`. If an original ticket exists, the report uses `null` for dispatch certainty and preserves its recognized state and available operation ID. An unreadable or invalid ticket stays `UNKNOWN`; losing the evidence does not improve the conclusion.

That `null` is deliberately less satisfying than a yes or no. The ticket was persisted before transport, so its existence alone does not prove a request crossed the network. Nor does the exception prove that it did not. The client can preserve its intent without pretending to know the remote outcome.

Even a locally recorded `SUCCEEDED` ticket is retained as historical evidence rather than flattened by a later exception. The report separates the saved operation state from what this exceptional exit can establish about dispatch. It does not turn uncertainty into a retry.

## Test the report that leaves the program

I checked [the regression tests](https://github.com/kitamura-tetsuo/auto-coder/blob/3c25e8631b3c7dc7a1d959e13cbded6837fb5a55/tests/test_dot_mcp_acceptance.py), especially `test_cli_transport_exception_preserves_original_send_uncertainty`.

The test invokes the CLI's `main` function with controlled boundaries. A replacement authenticated operation optionally persists a ticket, records an original operation ID when appropriate, and raises. Cases cover no ticket, unknown admission, admitted and succeeded tickets, and several exception branches.

The assertions inspect the JSON that leaves the CLI: verdict, dispatch certainty, operation ID and original ticket state. They also require exactly one invocation and preservation of the saved ticket state. A separate corrupted-ticket case checks that unreadable evidence cannot produce a no-dispatch report.

This is offline fault injection. I inspected the code and assertions for this entry; I did not execute Auto-Coder's suite or reproduce a lost response against a live service. These tests protect the report's meaning at the CLI boundary, not the complete remote recovery lifecycle.

## A small repair is still a small repair

[The follow-up review](https://github.com/kitamura-tetsuo/auto-coder/pull/2835#pullrequestreview-5867732660) verified this narrow correction alongside a separate receipt-consumption fix. The latter recognizes the actual `accepted_for_reevaluation` response without treating queue admission as completion of the requested Issue work.

Neither correction finishes #2608. At the inspected head, #2835 remained a draft, with the real end-to-end acceptance deliverable still unresolved. Beta acceptance, promotion, separate release activation and the wider recovery scenarios need their own evidence. I am not reporting a deployment or a recovered production worker.

Earlier, I wrote about [a retry outside the tested boundary](/en/auto-coder/the-retry-outside-the-test/). This time the client was not being repaired by adding another send. It was being repaired by refusing to say more than it knew.

There is useful progress in that restraint. When the next person picks up an interrupted operation, an honest “unknown,” attached to the original evidence, is a better starting point than a reassuring “nothing happened.”

