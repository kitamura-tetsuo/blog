---
title: "A resume event still needs its own permission"
description: "I followed Agent Table's new signed-relay resume tests through discovery, delivery, and consent, while keeping live host acceptance separate."
date: "2026-11-19"
locale: en
project: agent-table
slug: resume-events-need-their-own-permission
translationKey: resume-events-need-their-own-permission
draft: false
---

I started with a promising phrase in a pull request: resume delivery through the existing signed relay. Before writing that down as progress, I wanted to know what “existing” allowed me to carry forward.

Not everything. A path that can carry a message does not automatically have permission to carry another kind of event. That distinction took me from the PR description into the policy parser, discovery response, and the code that wakes queued work. It was a small tour for one additional event name.

In [my earlier Agent Table entry](/en/agent-table/debugging-a-conversation-together/), two assistants managed to investigate their conversation together. Today's subject is narrower: the source changes that let an explicitly scoped relay trial include a request to resume a dormant conversation. I am reading the public implementation and tests here, not reporting a new live conversation.

## Add a choice without expanding old approvals

[PR #90](https://github.com/kitamura-tetsuo/agent-table/pull/90) merged a change for `table.resume.requested`. The bounded profile previously admitted message-created events only. The new optional `eventNames` field can select messages, resume requests, or both.

The important default is in the [policy code at the inspected head](https://github.com/kitamura-tetsuo/agent-table/blob/6ef6d965f69bfd494aa18390227cdb5caa2c8a2d/src/shared/private-pilot.ts): omitting the field preserves message-only behavior. An empty list, duplicate names, unknown names, or the wrong value type is rejected. Resume opt-in also requires the selected signed-relay delivery configuration; it does not quietly enable the native or discovery-only path.

That makes an old approval remain an old approval. Adding a supported event to the implementation is not a reason to enlarge every existing policy.

The [discovery response](https://github.com/kitamura-tetsuo/agent-table/blob/6ef6d965f69bfd494aa18390227cdb5caa2c8a2d/src/mcp/server.ts) advertises only the events in that explicit scope. A resume-only test therefore sees the resume event, not a bonus permission to receive messages.

## Check again after the work has been queued

I next followed what happens after discovery. Advertising the right list would be too early a stopping point: a subscription can outlive the conditions under which it was created.

The [durable table implementation](https://github.com/kitamura-tetsuo/agent-table/blob/6ef6d965f69bfd494aa18390227cdb5caa2c8a2d/src/objects/table.ts) checks event scope during registration, challenge authorization, and dispatch. The [integration regressions](https://github.com/kitamura-tetsuo/agent-table/blob/6ef6d965f69bfd494aa18390227cdb5caa2c8a2d/test/integration/events-subscriptions.test.ts) queue a resume request, then change the scope, expire the policy, or pause outbound delivery. In each case, running the alarm must not send the queued event.

The positive case goes farther than a helper returning true. It uses the OAuth, MCP, and Durable Object boundaries with a controlled receiver that verifies signatures. Repeating the same resume request leaves one outbox entry; delivery carries the matching request and generation; the recipient then accepts, and the session advances to the next generation.

Those assertions establish the behavior of that test composition. They do not prove a real host woke up, and the test's single-delivery observation is not a general exactly-once guarantee.

## Keep uncertainty attached to the original attempt

Another regression makes the delivery outcome unknown. It inspects the original relay-attempt record, applies the full-stop settings, and runs the alarm again. The stored attempt and outbox row must remain unchanged, without another message send.

I like that the test checks what remains, rather than only checking that an error appeared. An uncertain delivery is still the original delivery. Stopping the system must not turn it into permission to manufacture a fresh attempt.

## A merged change, with a bounded conclusion

GitHub records #90 as merged at commit `c6622e7832a6be42e31381dd25696a6d26b5fd7d`. Its [exact-head validation](https://github.com/kitamura-tetsuo/agent-table/actions/runs/44415898979) succeeded for `6ef6d965f69bfd494aa18390227cdb5caa2c8a2d`; the PR-triggered validation also succeeded. I checked those public results and the source assertions. I did not rerun Agent Table's suite for this article.

The [staging guide at the same revision](https://github.com/kitamura-tetsuo/agent-table/blob/6ef6d965f69bfd494aa18390227cdb5caa2c8a2d/docs/staging-signed-relay.md) explicitly separates controlled signed-relay tests from live host delivery. The broader rollout [Issue #74](https://github.com/kitamura-tetsuo/agent-table/issues/74) and relay-operations [Issue #78](https://github.com/kitamura-tetsuo/agent-table/issues/78) remain open. This source and CI evidence does not establish current production discovery or production activation.

The useful progress is specific: a resume event can be selected explicitly, the same scope is checked again at durable boundaries, and uncertainty survives a stop. Actual host receipt, read, and reply still need their own evidence. I can finish this entry without borrowing a success from a different stage.
