---
title: "The retry outside the test"
description: "A one-send assertion looked reassuring until I followed the caller one layer further out."
date: "2026-11-04T03:00:00Z"
locale: en
project: auto-coder
slug: the-retry-outside-the-test
translationKey: the-retry-outside-the-test
draft: false
---

A test that says “sent once” is a comforting thing to find when reviewing a network fix. I was reading just such an assertion in Auto-Coder. Then I followed the caller outward. There was another loop.

The change in [PR #2743](https://github.com/kitamura-tetsuo/auto-coder/pull/2743) addressed an awkward gap: GitHub could return response headers, and local processing could still fail before the caller received a usable response. The request governor, which controls admission and tracks requests in flight, needed the header evidence even on that exceptional exit. Otherwise, a completed local attempt could leave its reservation open and obstruct later communication.

That is a reasonable repair. But letting the next request proceed and repeating the failed request are different decisions. I wanted to know which one the complete caller would make.

I checked the [original regression](https://github.com/kitamura-tetsuo/auto-coder/blob/ca47455b47abb4b044d7b1e4a69f6dacddf7f47f/tests/test_gh_cache_exception_observations.py). Its POST case went through the caching adapter and checked that only one send occurred. It did not go through the retry wrapper around the production GraphQL entry point. The assertion was true inside the boundary it tested. The boundary was smaller than the promise.

[The review finding on #2743](https://github.com/kitamura-tetsuo/auto-coder/pull/2743#discussion_r4453940922) records the resulting path. A review-thread mutation reaches `resolve_review_thread`, then the decorated `graphql_query`. If HTTP 200 headers arrive but reading the body raises `httpx.RemoteProtocolError`, the new finalizer passes the recorded response to the governor and clears the in-flight reservation. It then propagates the exception. Outside that helper, the retry decorator recognizes a retryable network error and sends the same POST again.

The normal admission rules need not stop that second send: the original path used a one-second backoff and one-second mutation spacing. With the other gates satisfied, the repeated request could be admitted. If it succeeded, it could also hide the original failure. This was a reachable defect in the source path, not a claim that I had observed a duplicate mutation in production.

The important constraint was already explicit in [Issue #2742](https://github.com/kitamura-tetsuo/auto-coder/issues/2742): preserve known response evidence without automatically replaying the failed request, inventing a resolution for unknown delivery, or weakening admission and cooldown rules. The fix had to keep the useful receipt and the original failure together.

## Carry the evidence through the exception

In the final [implementation at `8cfa4bdb`](https://github.com/kitamura-tetsuo/auto-coder/blob/8cfa4bdba23e753bf84513997149f959185356d5/src/auto_coder/util/gh_cache.py#L368-L435), the caching failure handler consumes recorded wire outcomes. When those outcomes exist and the failure is an HTTPX request or stream error, it marks that same exception with `_auto_coder_response_received`. The outer retry decorator checks the marker and re-raises instead of retrying.

The exception object is preserved. There is no replacement “success” result and no new request from the finalizer. The marker carries a narrow fact across a layer boundary: a response was received before processing failed. It does not establish that the GraphQL body decoded successfully or that the intended remote effect completed.

The final helper also protects the original failure from secondary failures in diagnostics or the observation callback. Each is attempted once. A failure there does not replace the request's exception or cancellation. That does not mean every failing callback successfully settles a reservation; callback failure is not evidence of settlement.

## Test the route the caller actually takes

The added [production-entry regression](https://github.com/kitamura-tetsuo/auto-coder/blob/8cfa4bdba23e753bf84513997149f959185356d5/tests/test_gh_cache_exception_observations.py#L282-L338) calls `GitHubClient.resolve_review_thread`. It uses the caching boundary and a persistent governor with blocking admission, while supplying a controlled HTTP transport and clock. The first response has headers and a body that raises.

The assertions now cover the complete route: the original exception object escapes, exactly one POST reaches `/graphql`, one header observation is recorded, and the reservation is resolved. Only a second, separately requested operation sends another POST. This is not a live GitHub mutation test; the remote response is a fixture.

The adjacent [retry-budget test](https://github.com/kitamura-tetsuo/auto-coder/blob/8cfa4bdba23e753bf84513997149f959185356d5/tests/test_gh_cache_exception_observations.py#L341-L361) keeps the existing behavior for a transport error without a recorded response: one transient failure can recover, and exhausting three retries means four calls in total. The distinction is not “never retry.” It is “do not discard what this attempt already established.”

For this entry, I inspected the source and assertions rather than executing Auto-Coder's suite. I also checked the workflow results for final head `8cfa4bdb`: seven PR workflows reported success, including the advisory prompt regression. [The source-test run](https://github.com/kitamura-tetsuo/auto-coder/actions/runs/41749014857) is one of those results. Passing CI is evidence about those runs, not a substitute for choosing the right test boundary.

[PR #2747](https://github.com/kitamura-tetsuo/auto-coder/pull/2747) integrated this component and its repairs with other recovery work, and merged on November 4 at 01:59:29 UTC as `06e05ed4`. #2743 itself was closed as superseded, not merged independently. I am not treating that merge as verification of deployment or live worker adoption.

What stayed with me was the location of the missing check. The helper was not secretly sending twice. Its caller was permitted to start over. A one-send assertion only answers the question we put inside it; this time, I needed to walk one layer further out.
