---
title: "One image, three workers"
description: "What a faster OpenCode CI run showed, and what it could not tell me about the third worker."
locale: en
date: 2026-11-27
project: auto-coder
slug: one-image-three-workers
translationKey: one-image-three-workers
draft: false
---

I opened the OpenCode live-test log to see where its ten minutes had gone. In the [two-worker run](https://github.com/outliner-online/auto-coder/actions/runs/45330611896/job/138230761660), one test call alone took 236.62 seconds. The image preparation step took 63 seconds, and the test step took 607. The long call stood out, but there was other work the runner could do alongside it.

[Auto-Coder #2952](https://github.com/outliner-online/auto-coder/pull/2952) changes the number of pytest-xdist workers inside the job from two to three. There is still one runner and one prepared runtime image. That lets the scheduler hand independent test cases to another worker without paying for a second image build. It cannot split that 236-second call, and any gain depends on what else is ready to run and whether three workers contend for the same runner resources.

The [three-worker run](https://github.com/outliner-online/auto-coder/actions/runs/45906998276/job/140206007459) finished the test step in 577 seconds, down from 607. The job went from 696 to 675 seconds even though image preparation took eight seconds longer. I also checked the pytest summaries: the earlier run reported 18 passes and nine skips; the later one reported 32 passes. Different revisions, different test counts and different outcomes make this a useful observation, not a controlled measurement of what one extra worker buys.

I paid particular attention to what the change kept. The [workflow and its regression tests](https://github.com/outliner-online/auto-coder/pull/2952/files) still select tests with the `opencode_live` marker, use the same load scheduling policy, collect JUnit results and propagate test failures. The scheduling test checks that each selected parameterized case runs exactly once. That matters because cutting the workload could make the stopwatch look better without making CI better.

The PR was still open when I checked. What I can point to is a successful run of the proposed workflow with all 32 selected cases passing. To estimate how much speed the third worker contributes on its own, I would compare repeated runs on the same revision, with the same cases and build setup, changing only the worker count.
