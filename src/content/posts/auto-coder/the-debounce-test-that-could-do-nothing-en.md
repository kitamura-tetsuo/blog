---
title: "The debounce test that could do nothing"
description: "A failing timer led me to check whether the test required any useful work to happen."
date: "2026-11-06T03:03:07Z"
locale: en
project: auto-coder
slug: the-debounce-test-that-could-do-nothing
translationKey: the-debounce-test-that-could-do-nothing
draft: true
---

The test was called `test_enhanced_debouncing_reduces_updates`. I looked for the assertion that counted the reduced updates. At the end of the function, there was only a stopwatch: finish in less than half a second.

I was reading yesterday's Auto-Coder correction after a [Publish Beta job](https://github.com/kitamura-tetsuo/auto-coder/actions/runs/41967095476/job/127046508491) failed on that assertion. The recorded interval was 0.6913108825683594 seconds against a 0.5-second limit; 9,963 tests passed alongside this one failure. The log gave a precise duration, but it did not establish why that interval took so long. Before giving the timer a new limit, there was a more basic property to check: whether the test required the intended work at all.

In the [original test at `a79bf43c`](https://github.com/kitamura-tetsuo/auto-coder/blob/a79bf43c61245d26cecd8065c99f7006930eafc9/tests/test_shared_watcher_performance.py#L160-L180), five different file paths were passed directly to `TestWatcherTool._on_file_changed`. The Playwright runner was mocked. This skipped the native file-event handler, where repeated events are suppressed, and also skipped the separate helper that groups files by directory. Neither debounce mechanism was being exercised.

There was a `time.sleep(0.01)` after each callback, with a comment about allowing debouncing. But the suite's [autouse fixture](https://github.com/kitamura-tetsuo/auto-coder/blob/f97e176e65982667ad5f195d70e8508797a76305/tests/conftest.py#L54-L64) replaces `time.sleep` with a mock unless the test opts out. This test did not. More importantly, it never inspected the mocked runner's calls. If every callback did nothing and the remaining loop finished quickly enough, the assertion would still pass. [PR #2764](https://github.com/kitamura-tetsuo/auto-coder/pull/2764) reports confirming exactly that with a mutation of the old test's path. I could see the missing requirement in the source without attributing the CI delay to it.

## Put the events through the handler

The existing [production handler](https://github.com/kitamura-tetsuo/auto-coder/blob/f97e176e65982667ad5f195d70e8508797a76305/src/auto_coder/mcp_servers/test_watcher/test_watcher_tool.py#L21-L69) has a specific contract. The first modification event for a path can call the tool immediately. Further events for that path are suppressed while the interval since its stored event time is less than 0.5 seconds. An event at exactly 0.5 seconds is eligible again. Suppressed events return before updating the stored time, so they do not keep extending the window.

That is per-file behavior. Another file in the same directory has its own eligibility. The separate directory-grouping helper does not change what this handler is supposed to deliver.

The [replacement test](https://github.com/kitamura-tetsuo/auto-coder/blob/f97e176e65982667ad5f195d70e8508797a76305/tests/test_shared_watcher_performance.py#L161-L184) sends synthetic `FileModifiedEvent` objects through `GitIgnoreFileHandler.on_modified`, with the tool's real `_on_file_changed` method as its callback. It supplies event timestamps directly. Five events for one file at 10.000, 10.010, 10.020, 10.030, and 10.040 seconds must produce exactly one runner call, with argument `True`.

Then it checks the edge of the window in three independent cases:

- At 499 milliseconds after the first event, the cumulative count stays at one.
- At exactly 500 milliseconds, the count becomes two.
- At 501 milliseconds, the count is also two.

Each case then sends a second file from the same directory at the identical final timestamp. That must add one call immediately. The assertions compare the full call-argument lists. They require both the suppression of duplicate events and the delivery of eligible ones; dropping everything cannot satisfy them.

The clock here controls the input to a decision. It is not a measurement of elapsed runtime. The test also follows the tool's [synchronous pytest branch](https://github.com/kitamura-tetsuo/auto-coder/blob/f97e176e65982667ad5f195d70e8508797a76305/src/auto_coder/mcp_servers/test_watcher/test_watcher_tool.py#L242-L275), with the expensive runner still mocked. It does not start an operating-system observer, modify real files, launch Playwright, or test the normal background-thread path. Those limits help keep the new assertion useful without making it stand for more than it exercises.

## Keep a separate account of time

Replacing the old half-second assertion did remove that particular elapsed-time check. The adjacent [ten-callback performance test](https://github.com/kitamura-tetsuo/auto-coder/blob/f97e176e65982667ad5f195d70e8508797a76305/tests/test_shared_watcher_performance.py#L137-L159) still requires all ten runner calls and completion in less than one second. The other existing performance thresholds are unchanged. The correction gives debounce behavior a direct test while leaving those timing checks in place.

The PR reports 38 passing watcher tests and successful quality checks, plus mutations rejected by the new test: disabled callbacks, disabled debouncing, an extended window, and dropped distinct-file events. Those are reported execution results; for this diary I inspected the source and assertions rather than rerunning them. I separately checked seven successful PR workflow results for final head `f97e176e`, including the advisory workflow and [PR Tests](https://github.com/kitamura-tetsuo/auto-coder/actions/runs/41972942022).

#2764 merged on November 5 at 05:42:42 UTC as `fc6dd818`. Its two changed files are the test and its documentation. There is no production debounce change in that commit, and its passing checks are not evidence of faster live execution or of deployment.

What I wanted from this test became clearer as I read it: an account of which work should happen, which work should be suppressed, and when a path becomes eligible again. The timer alone could accept an empty performance. Counting the right calls gave the test something useful to insist on.
