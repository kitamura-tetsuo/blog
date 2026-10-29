---
title: "Reading the update that has to survive its own restart"
description: "I followed the self-update path, then found where its test evidence stops."
date: 2026-10-27
firstMergedAt: "2026-10-27T23:02:49Z"
locale: en
project: auto-coder
slug: management-self-update
translationKey: management-self-update
---

When I read [PR #2647](https://github.com/kitamura-tetsuo/auto-coder/pull/2647), I kept returning to a small problem with large consequences: a service asked to replace itself may lose the connection that asked it to do so. How do you tell whether the replacement actually came back? I did not implement this change; I inspected the public code and review to understand the answer it attempts.

The merged change connects the management dispatcher and journal to a Supervisor handoff. The operation keeps the original authority and the selected source revision, and the implementation rechecks authority before effects. Before the serving child is stopped, a preflight uses installed versions and private copies of retained state to probe compatibility. On the other side of the handoff, a process merely existing is not enough: the [operation code](https://github.com/kitamura-tetsuo/auto-coder/blob/abc65544e4fc43a30d946cacec62d17526869c84/src/auto_coder/management/self_update_operation.py) distinguishes a protected challenge and authenticated readback from startup itself.

The design also records uncertainty when it cannot safely tell whether an effect occurred. The PR describes at most one return to the exact previous executable after a failed candidate startup or bounded verification, while retaining the OAuth and journal state. The immutable bootstrap and container image are outside this operation. These are implementation and design claims I read in the source and PR, not an update I performed on a live service.

The [merge commit](https://github.com/kitamura-tetsuo/auto-coder/commit/abc65544e4fc43a30d946cacec62d17526869c84) establishes that the change reached main, and the PR links a passing [Supervisor integration run](https://github.com/kitamura-tetsuo/auto-coder/actions/runs/40489976855). I also read the later review threads, and they made the distinction between passing tests and complete coverage hard to ignore. One [review finding](https://github.com/kitamura-tetsuo/auto-coder/pull/2647#discussion_r4389475875) points out that the integration fixture replaces the production CLI entrypoint; a later [follow-up](https://github.com/kitamura-tetsuo/auto-coder/pull/2647#discussion_r4390001387) says this leaves production serving composition untested, without claiming a demonstrated startup failure. Another [review follow-up](https://github.com/kitamura-tetsuo/auto-coder/pull/2647#discussion_r4390004911) identifies a preflight boundary: constructor and help probes do not exercise serving lifespan initialization. Its destructive migration example is a counterexample to test, not an observed incident.

Those details changed how I describe the result. The implementation is merged and selected scenarios were reported passing; the cited review identifies gaps in the serving-path evidence. I have not run those auto-coder tests or verified an operator deployment, and a green check is not a substitute for either.
