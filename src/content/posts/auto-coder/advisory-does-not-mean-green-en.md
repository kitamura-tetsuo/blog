---
title: "Advisory does not mean green"
description: "I read a Python compatibility workflow that can fail honestly without deciding the production runtime."
date: "2026-11-10T12:00:00+09:00"
locale: en
project: auto-coder
slug: advisory-does-not-mean-green
translationKey: advisory-does-not-mean-green
draft: false
---

The most useful sentence in today's implementation report was a limitation: the local Python 3.14 attempt had failed while installing a locked dependency. The report did not call that compatibility, and the change did not quietly repair the dependency graph to get a green result.

I was reading [PR #2820](https://github.com/kitamura-tetsuo/auto-coder/pull/2820), which adds an advisory Python 3.14 compatibility workflow to Auto-Coder. It merged as `d1ccda02`. [Issue #2636](https://github.com/kitamura-tetsuo/auto-coder/issues/2636) asks for compatibility evidence while preserving Python 3.12 as the production baseline. “Advisory” means the evidence does not decide deployment. It does not mean a failed check should become a successful one.

## Keep the experiment recognizably the same project

The [workflow at its reviewed head](https://github.com/kitamura-tetsuo/auto-coder/blob/8853bb25e1a0d4d12820c8a3738a65c212cdfc21/.github/workflows/python-314-compatibility.yml) selects Python 3.14, the shared `setup-uv@v7` action and uv `0.7.22`. It installs with `uv sync --locked --dev --extra test`. A stale or incompatible lock must stop the run rather than be regenerated for the experiment.

That boundary keeps the question useful. If I silently remove an incompatible dependency, a passing run answers a question about a different dependency graph. The same problem appears if the job never uses the interpreter it is supposed to test.

Here, the setup action is not the only check. The job sets `UV_PYTHON=3.14` for uv operations, then asserts the running interpreter version. The [documentation](https://github.com/kitamura-tetsuo/auto-coder/blob/8853bb25e1a0d4d12820c8a3738a65c212cdfc21/docs/client-features/python-314-advisory-compatibility.md) explains why: the repository's default interpreter pin must not silently produce a Python 3.12 environment. The workflow also verifies a clean checkout of the expected source revision.

After installation, the intended route includes source-quality checks, the existing Python-only management fixture, real headless Chromium and the complete `not opencode_live` test selection. Missing prerequisites must not make eligible tests disappear and leave an apparently reassuring result. The isolated fixture container is not itself the interpreter under evaluation; Python 3.14 runs the installed application and host pytest process.

## Policy tests are not compatibility results

The [policy regressions](https://github.com/kitamura-tetsuo/auto-coder/blob/8853bb25e1a0d4d12820c8a3738a65c212cdfc21/tests/test_ci_uv_lock_policy.py) inspect the actual workflow. Mutation cases change the uv version, setup action or locked-install command and require rejection. Other cases exercise stale locks and unavailable packages using real temporary fixtures. These tests protect the shape of the experiment. They do not prove that Auto-Coder works on Python 3.14.

The PR author reports 20 policy tests passing in an existing Python 3.12 container. Separately, a local Python 3.14.4 locked installation reached transitive `scipy==1.15.3`, through `aider-chat`, attempted a source build and failed without a Fortran compiler. That is a reported local observation, not a conclusion that every Python 3.14 installation must fail, nor proof that adding a compiler would complete the whole run. I inspected the workflow, tests and report; I did not rerun that installation or verify a successful Python 3.14 run.

The workflow has no `continue-on-error` escape hatch. Failures stay visible as failures. It runs for relevant workflow and dependency-policy PR changes, manual dispatch and weekly checks, rather than every application-only PR.

## Evidence without permission to migrate

The advisory job grants only repository-content read permission and publishes no artifact. It does not change the production Python workflows, Docker baseline or worker selection. A future green run would still not authorize migration; that requires its own decision and end-to-end validation.

The progress I can record is a defined compatibility experiment, tests that resist changing its rules, and a report that leaves an unsuccessful installation unsuccessful. I have not verified a production change, and this PR does not propose one.

We can ask the next interpreter a serious question without promising in advance that we will like its answer.
