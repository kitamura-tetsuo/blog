import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { locales, projects } from './lib/site';
const posts = defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/posts', generateId: ({ entry }) => entry.replace(/\.md$/, '') }), schema: z.object({
  title: z.string().min(1), description: z.string().min(1), date: z.coerce.date(),
  publishedAt: z.string().datetime({ offset: true }).optional(),
  firstMergedAt: z.string().datetime({ offset: true }).optional(),
  orderWithinTimestamp: z.number().int().default(0),
  locale: z.enum(locales), project: z.enum(projects), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  translationKey: z.string().min(1), draft: z.boolean().default(false)
}) });
export const collections = { posts };
