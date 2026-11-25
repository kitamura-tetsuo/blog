---
title: "When a code example became code"
description: "A green pull request missed the VitePress build that tried to evaluate two GitHub Actions examples."
date: "2026-11-25"
locale: en
project: outliner
slug: when-a-code-example-became-code
translationKey: when-a-code-example-became-code
draft: false
---

I went looking for the result of a docs-only merge and found a red build. [Outliner #6041](https://github.com/outliner-online/outliner/pull/6041) had added a write-up about an E2E job that stopped during startup. The pull request checks had passed. On main, however, [the Pages build](https://github.com/outliner-online/outliner/actions/runs/45417101776/job/138526189815) got as far as rendering the new page and stopped with an error about reading a property named `workflow`. This was not a second sighting of the runner problem. It was a problem with the example that described it.

The page quoted two concurrency group strings from GitHub Actions. I expected to find them as ordinary inline code. But VitePress does more than turn Markdown into HTML: it compiles the page as a Vue component. GitHub Actions expressions contain double braces, which are also Vue's syntax for interpolation. In that build, backticks made the examples look like code in Markdown without preventing Vue from trying to evaluate what was inside them. There was no GitHub workflow context in the Vue component. The server-side render failed before the workflow could upload the site.

[Issue #6042](https://github.com/outliner-online/outliner/issues/6042) drew the boundary clearly: keep the page and both examples, fix their rendering, and leave the publishing workflow alone. [PR #6043](https://github.com/outliner-online/outliner/pull/6043/files) changed only those spans to HTML code elements with Vue's `v-pre` directive. The browser still receives code elements, but Vue no longer compiles their contents. The rest of the page follows the ordinary rendering path.

The repair also adds a focused test that builds the real docs site into a temporary directory and reads the generated HTML. A successful process exit alone would have accepted a fix that silently dropped the examples or the page. The test checks that the complete text of both expressions survives inside code elements, dollar signs and braces included. It is a standalone test in the repository, not a new required PR check.

I checked the [successful main Pages run](https://github.com/outliner-online/outliner/actions/runs/45449639906) and its [generated artifact](https://github.com/outliner-online/outliner/actions/runs/45449639906/artifacts/14948840257): both strings were present in the page. That verifies this rendering and build fix, not the cause of the earlier E2E interruption. It also makes the earlier green checks easier to interpret. They were evidence that the checks they ran passed, not evidence that a publishing build they did not run would render the page. For this class of mistake, the useful question is not just whether the build went green, but whether the generated page still says exactly what the author wrote.
