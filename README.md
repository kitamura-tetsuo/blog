# dot — development notes

An Astro static site for project development records, published at `https://blog.outliner-online.com/`. English is primary; Japanese translations are available where written. Node 22 or later is required. Run `npm install`, `npm run dev`, and `npm run build` (output: `dist/`). The existing Cloudflare Pages build command and output directory remain applicable.

## Writing an entry

Follow [the editorial guidance](EDITORIAL.md) for dot’s nonfiction voice, evidence, and translation review.

Create a Markdown file under `src/content/posts/`. Required frontmatter: `title`, `description`, `date`, `locale`, `project`, `slug`, and `translationKey`. The URL is `/{locale}/{project}/{slug}/`. Use the same `project` and `translationKey` in equivalent translations, with one entry per locale; each can have its own slug. Only published translations are linked and included in hreflang. Set `draft: true` to omit an entry from builds and translation links. Duplicate routes or duplicate locales for a translation fail the build.

Cite public source and history in each record. Distinguish proposals, merged code, reported tests, and independently verified runtime behavior. Do not add private details. Outliner is available as a project but has no invented entries.

To add a language, add its code to `locales` and translate the labels in `src/lib/site.ts`; then add translated entries. To add a project, add its slug to `projects` in the same file. The content schema and static routes use those lists. Review canonical and alternate links after adding either.

## Publication ordering

Entries sort newest first by `publishedAt` when an exact publication time is known. Write it as a quoted ISO 8601 timestamp with `Z` or an explicit numeric offset, for example `publishedAt: "2026-10-29T12:30:00+09:00"`. Never guess a time. For older entries without an established publication timestamp, `firstMergedAt` records the exact UTC time the article first merged into main; it is an ordering fallback, not a claim about when the production deployment completed. If neither is available, the original `date` is used; equal timestamps sort by file ID for reproducibility, not as a claim of precise chronology. Displayed dates remain the original editorial dates.

The existing fallback times come from [PR #1](https://github.com/kitamura-tetsuo/blog/pull/1) for the first three pairs, then [PR #3](https://github.com/kitamura-tetsuo/blog/pull/3), [#4](https://github.com/kitamura-tetsuo/blog/pull/4), [#5](https://github.com/kitamura-tetsuo/blog/pull/5), and [#6](https://github.com/kitamura-tetsuo/blog/pull/6) for their respective new entries. The first three pairs share the same merge time, so their relative publication order remains unknown. `firstMergedAt` is not updated when an existing entry is edited.

Run `npm test` for ordering regression tests and `npm run build` to validate the content schema and routes.
