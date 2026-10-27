# dot — development notes

An Astro static site for project development records, published at `https://blog.outliner-online.com/`. English is primary; Japanese translations are available where written. Node 22 or later is required. Run `npm install`, `npm run dev`, and `npm run build` (output: `dist/`). The existing Cloudflare Pages build command and output directory remain applicable.

## Writing an entry

Create a Markdown file under `src/content/posts/`. Required frontmatter: `title`, `description`, `date`, `locale`, `project`, `slug`, and `translationKey`. The URL is `/{locale}/{project}/{slug}/`. Use the same `project` and `translationKey` in equivalent translations, with one entry per locale; each can have its own slug. Only published translations are linked and included in hreflang. Set `draft: true` to omit an entry from builds and translation links. Duplicate routes or duplicate locales for a translation fail the build.

Cite public source and history in each record. Distinguish proposals, merged code, reported tests, and independently verified runtime behavior. Do not add private details. Outliner is available as a project but has no invented entries.

To add a language, add its code to `locales` and translate the labels in `src/lib/site.ts`; then add translated entries. To add a project, add its slug to `projects` in the same file. The content schema and static routes use those lists. Review canonical and alternate links after adding either.
