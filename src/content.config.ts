import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob, file } from "astro/loaders";

const articles = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/articles" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    selected: z.boolean().default(false),
    pinned: z.boolean().default(false),
    showInNews: z.boolean().default(false),
    newsSummary: z.string().optional(),
    url: z.url().optional(),
  }),
});

const papers = defineCollection({
  loader: file("src/data/papers.yml"),
  schema: z.object({
    category: z.enum(["journal", "conference", "preprint", "workshop", "poster"]),
    selected: z.boolean().default(false),
    date: z.coerce.date(),
    year: z.number(),
    title: z.object({ ja: z.string(), en: z.string() }),
    authors: z.array(
      z.object({ name: z.string(), isSelf: z.boolean().default(false) })
    ),
    venue: z.object({ ja: z.string(), en: z.string() }),
    description: z
      .object({ ja: z.string().optional(), en: z.string().optional() })
      .optional(),
    links: z
      .object({
        pdf: z.url().optional(),
        code: z.url().optional(),
        project: z.url().optional(),
        bibtex: z.url().optional(),
      })
      .default({}),
    doi: z.string().optional(),
    arxivId: z.string().optional(),
    showInNews: z.boolean().default(false),
    newsSummary: z
      .object({ ja: z.string().optional(), en: z.string().optional() })
      .optional(),
  }),
});

const awards = defineCollection({
  loader: file("src/data/awards.yml"),
  schema: z.object({
    selected: z.boolean().default(false),
    date: z.coerce.date(),
    year: z.number(),
    title: z.object({ ja: z.string(), en: z.string() }),
    organization: z.object({ ja: z.string(), en: z.string() }),
    description: z
      .object({ ja: z.string().optional(), en: z.string().optional() })
      .optional(),
    url: z.url().nullish(),
    showInNews: z.boolean().default(false),
    newsSummary: z
      .object({ ja: z.string().optional(), en: z.string().optional() })
      .optional(),
  }),
});

const manualNews = defineCollection({
  loader: file("src/data/manual-news.yml"),
  schema: z.object({
    date: z.coerce.date(),
    title: z.object({ ja: z.string(), en: z.string() }),
    url: z.object({ ja: z.string(), en: z.string() }).optional(),
  }),
});

export const collections = { articles, papers, awards, manualNews };
