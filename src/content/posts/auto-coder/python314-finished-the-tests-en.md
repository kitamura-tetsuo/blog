---
title: "Python 3.14 finished the tests. Production stayed on 3.12."
description: "I revisited an unsuccessful compatibility experiment and found a completed non-live run, with the production interpreter boundary still intact."
date: "2026-11-16"
locale: en
project: auto-coder
slug: python314-finished-the-tests
translationKey: python314-finished-the-tests
draft: false
---

I went back to a sentence I had left unfinished in practical terms: I had not verified a successful Python 3.14 run.

In [my earlier entry](/en/auto-coder/advisory-does-not-mean-green/), the experiment stopped at dependency installation. That was a useful result, but it left me with rather less to celebrate than the workflow's name might suggest. This time I could follow the public CI record past installation and all the way to the test summary.

The summary was substantial: 13,345 passed, 137 skipped, 27 deselected. I still needed to check what had run, what had changed to let it run, and whether “compatible” had quietly grown into “ready for production.” Reading a green result is quick. Deciding which sentence it supports takes me longer.

## The lock changed in review, not during the experiment

[Auto-Coder PR #2846](https://github.com/outliner-online/auto-coder/pull/2846) began as a dependency update. Its final diff also repairs the Python 3.14 dependency graph and integration fixtures. The title alone does not describe that work.

The older graph brought in Aider's pinned NumPy and SciPy releases, which lacked Python 3.14 wheels. The [revised dependency declarations](https://github.com/outliner-online/auto-coder/blob/2b8273af5ab183e0ef2a9fa37f865209db05b5a8/pyproject.toml) keep NumPy 1.26.4 and SciPy 1.15.3 below Python 3.14, and select newer bounded ranges for 3.14 and above: NumPy `>=2.3,<2.5` and SciPy `>=1.16.1,<1.18`. They also add `audioop-lts` from Python 3.13 onward for Aider's pydub import.

That is an explicit source-and-lock repair, rather than permission for CI to improvise a graph. The [final workflow](https://github.com/outliner-online/auto-coder/blob/2b8273af5ab183e0ef2a9fa37f865209db05b5a8/.github/workflows/python-314-compatibility.yml) still installs with `uv sync --locked --dev --extra test`. It verifies Python 3.14 and the clean source revision before quality checks and tests.

I also looked for something stronger than an import that appeared to work. The [new dependency tests](https://github.com/outliner-online/auto-coder/blob/2b8273af5ab183e0ef2a9fa37f865209db05b5a8/tests/test_aider_dependency_compatibility.py) assert that Aider's backend objects actually loaded: the client can catch an ImportError, so importing its wrapper alone is insufficient. A small PageRank calculation exercises the numerical dependencies too. These checks make the dependency repair observable.

## Two interpreters have different jobs

The more interesting complication was that a Python 3.14 test host still has to test a Python 3.12 production boundary.

The workflow installs both interpreters. The application and pytest host use 3.14; worker and management integration fixtures use a separately selected real 3.12 interpreter. The [fixture helper](https://github.com/outliner-online/auto-coder/blob/2b8273af5ab183e0ef2a9fa37f865209db05b5a8/tests/support/production_runtime.py) fails if that interpreter is unavailable instead of skipping the test.

There is a corresponding installer correction. Creating a virtual environment with the configured interpreter was not enough: synchronization also needed an explicit interpreter argument, so an inherited `UV_PYTHON=3.14` could not replace the selected fixture runtime. The [worker integration regression](https://github.com/outliner-online/auto-coder/blob/2b8273af5ab183e0ef2a9fa37f865209db05b5a8/tests/test_worker_versions_integration.py) sets that outer selection to 3.14, runs the real preparation path, and checks that the installed interpreter is still 3.12.

Other repairs make the observations less dependent on the host interpreter: coverage uses its context-capable `ctrace` core, and bootstrap-store SQLite connections close explicitly after their transaction scope. The [compatibility notes](https://github.com/outliner-online/auto-coder/blob/2b8273af5ab183e0ef2a9fa37f865209db05b5a8/docs/client-features/python-314-advisory-compatibility.md) explain those changes. Getting farther through the suite exposed more than a wheel-installation problem; it exposed assumptions in the machinery used to test the boundary.

## What the completed run establishes

The [advisory run](https://github.com/outliner-online/auto-coder/actions/runs/43776468395) succeeded for head `2b8273af5ab183e0ef2a9fa37f865209db05b5a8`. I read its published job log: the selection collected 13,509 items, deselected 27, and finished with 13,345 passed and 137 skipped. The command selects `not opencode_live`; this is a completed non-live selection, not a claim that every test ran without skips. I inspected the public source and CI evidence while writing; I did not rerun that suite myself.

GitHub records the PR merging at 00:57:11 UTC on November 16 as `37548677b4088a51f39f04ce9a713f1abc973bf9`. That establishes a merged compatibility repair and a successful advisory run at its exact pre-merge head.

It does not establish Python 3.14 production adoption. [Issue #2636](https://github.com/outliner-online/auto-coder/issues/2636) keeps that decision separate, and the revised publication-policy test still exercises 3.12 acceptance and 3.14 rejection. The next production claim would need its own migration decision and end-to-end runtime evidence.

I can finally update the earlier sentence: a successful Python 3.14 non-live run is now visible. I can leave the production sentence alone. Both are progress, because the test tells us more without quietly changing what it is allowed to decide.
