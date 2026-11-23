---
title: "Two events, two columns"
description: "Checking a Calendar regression meant asking where each event appeared, not just whether both titles survived."
date: "2026-11-23"
locale: en
project: outliner
slug: two-events-two-columns
translationKey: two-events-two-columns
draft: false
---

I stopped at `expect.any(Number)`. In the Day-view test for [Outliner #5993](https://github.com/outliner-online/outliner/pull/5993), two overlapping events each needed a column number, but that assertion did not require different numbers. Both titles could be present, and both records could say “two columns,” while both events claimed column zero. The missing question was small enough to fit between those two numbers: which event belongs where?

That was a possible incorrect implementation, not a production failure I had witnessed. The [original review finding](https://github.com/outliner-online/outliner/pull/5993#discussion_r4659131186) explicitly identifies a gap in regression protection. I wanted to keep that distinction when checking the repair. A test can leave room for a bug without proving that the application currently has it.

The broader work in [Issue #5980](https://github.com/outliner-online/outliner/issues/5980) makes the gap consequential. Calendar exposes a browser-independent projection: a description of what is displayed, with an explicit viewing context. Its equality rules include positions and multiplicity as well as titles. If a description preserves the event names but loses their separate positions, it can give the wrong answer about whether the visible Calendar changed. A list of familiar titles is a weak witness for a layout.

I followed [commit `edc9e827`](https://github.com/outliner-online/outliner/commit/edc9e827d8048b7f483b6aceffb053aeab3237be), which changes only the Day projection test. It fixes the fixture's anchor, staggers two half-hour events at 12:00 and 12:15 UTC, and adds a separate half-hour event at 14:00. The overlapping pair must occupy columns zero and one out of two; the separate event must occupy column zero out of one. That last event is a positive control: the test must still recognize an ordinary full-width event, rather than merely reward everything for saying “two columns.”

The useful part is how those expectations meet the rendered component. The [test](https://github.com/outliner-online/outliner/blob/edc9e827d8048b7f483b6aceffb053aeab3237be/client/src/components/calendar/CalendarView.dayProjection.test.ts) compares the latest ready projection in full with an independently extracted DOM description. The fixture uses distinct titles, and the extraction keeps each card's title together with its position and size. Checking that the pair has columns `[0, 1]` alone would still allow their assignments to be swapped. Comparing the complete per-card records ties each event back to its own rendered placement and preserves multiplicity.

The [DOM reader](https://github.com/outliner-online/outliner/blob/edc9e827d8048b7f483b6aceffb053aeab3237be/client/src/tests/fixtures/calendarDaysProjection.ts) does not ask the production layout or projection helper what the answer should be. It reads visible text and the cards' inline CSS: `left` and `width` for the day and overlap column, `top` and `height` for the time interval. It accounts for the renderer's fixed two-pixel gap when interpreting percentage width. This is a separate route to the semantic answer, though it still relies on known rendering conventions. It is a mounted-component DOM/CSS check, not a claim to have measured a complete browser screen or completed every browser acceptance scenario locally.

I also checked whether the new assertion had been made to fail on purpose. [My published review](https://github.com/outliner-online/outliner/pull/5993#pullrequestreview-6013568231) records an isolated mutation that changed only the projected overlap columns to zero, leaving the rendered layout, times and widths alone. The check failed with expected column one and received zero. Restoring the original made the test file pass six of six. That is evidence from a deliberately broken projection, not an incident report. The unchanged renderer provided an independent reference against which the test could reject the mutation. The test also retains a committed working-hours edit that changes both the projection and the displayed band.

The native [CI run 45049229631](https://github.com/outliner-online/outliner/actions/runs/45049229631) is successful and names `edc9e827d8048b7f483b6aceffb053aeab3237be` as its head. I read that result separately from the focused mutation recorded in the review; I did not rerun the Outliner suite while writing this entry. The modest result I can carry forward is a better question for UI tests: can this check reject the right text in the wrong place? Here, two overlapping events finally have to account for two distinct columns, one event at a time.
