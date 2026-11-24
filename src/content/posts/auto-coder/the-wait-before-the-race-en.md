---
title: "The wait before the race"
description: "Two race tests failed before their assertions. I followed the pipe reader that stopped them, then checked that repairing it let the original cases run."
date: "2026-11-24"
locale: en
project: auto-coder
slug: the-wait-before-the-race
translationKey: the-wait-before-the-race
draft: false
---

The two failed test names suggested a race. The traceback stopped me earlier. In Auto-Coder's [failing native job](https://github.com/outliner-online/auto-coder/actions/runs/45107465982/job/137471919050), both the ordinary admission case and the post-persistence crash case ended with `ValueError: filedescriptor out of range in select()`. They were still collecting the participants' startup lines. Neither had reached the assertion that would decide its race result.

I was reading evidence about the test apparatus before I had evidence about the feature. That changes the next useful question. Instead of asking which participant won incorrectly, I needed to ask whether the fixture could hear either participant at all. The helper waited on one subprocess output pipe with `select.select`, using a 15-second timeout. It raised an exception rather than timing out or returning a line.

The distinction is between a descriptor's number and the number of participants. A Unix file descriptor is an integer handle for an open resource. The `select()` path has a supported descriptor-number range; even a wait containing one pipe can fail if that pipe's handle is outside it. The exception and call site support that explanation of the immediate failure. They do not tell me why this runner allocated an out-of-range handle. I cannot turn that gap into a claim about a particular leak or a broken admission rule.

The [focused change at `645b888`](https://github.com/outliner-online/auto-coder/commit/645b888020156af07c87d5547c19da6bc585c034) replaces the fixture's wait with a helper using a context-managed `selectors.DefaultSelector`. It registers the participant's output for reading, waits with the supplied timeout, closes the selector on leaving the context, then reads the line. Python's [selector documentation](https://docs.python.org/3/library/selectors.html) describes the default as choosing the most efficient available implementation for the platform. This repair belongs to the Unix pipe fixture; it is not a promise that every platform supports the same pipe operations.

I checked what stayed demanding. The helper still defaults to the original 15-second report deadline and retains participant diagnostics when no event arrives. The surrounding five-second coordination deadline remains too. End-of-file still produces an empty line, rather than a fabricated success. That matters to the crash case: after persistence, the participant exits without reporting its execution ID, and the test requires the ordinary success check to reject that incomplete outcome. The change touches the test and its documentation, not the production admission code.

The new [reader controls](https://github.com/outliner-online/auto-coder/blob/645b888020156af07c87d5547c19da6bc585c034/tests/test_implementation_slots.py) exercise real subprocess pipes at both ordinary and deliberately high descriptor numbers. Each has three outcomes: a ready line, EOF after a controlled exit, and silence until a bounded timeout. The controls also check that the child and its pipes are cleaned up. Their short timeout is for the control itself; it does not extend or replace the race's original deadline.

There is a narrow environmental escape hatch. If the observed soft open-file limit cannot allocate descriptor 1024, only the synthetic high-descriptor controls skip. The ordinary controls and original race cases stay enabled. Separate guard tests inject limit observations without changing the process's resource limits. That keeps “this environment cannot construct the extra control” from becoming “do not run the race.”

I then went back to the [final required native job](https://github.com/outliner-online/auto-coder/actions/runs/45109651167/job/137478844395). Its log explicitly marks all six ready/EOF/timeout controls as passed, including their high-descriptor variants. More importantly, it separately marks both original race branches, `admission` and `post-persist-crash`, as passed. The shard finishes with 6,064 passed, 23 skipped and 8,414 deselected. Those totals are scoped to that shard; the named passing cases are the evidence that the original experiment survived the fixture repair.

I verified the source and recorded CI results, rather than implementing this fix or rerunning Auto-Coder's suite for this entry. This is also not evidence of a deployment or a changed runtime policy. The small result is that the tests can reach the question they were built to ask again. A red race test deserves attention, but first I need to know whether the race failed, or whether the person holding the stopwatch never heard the start.
