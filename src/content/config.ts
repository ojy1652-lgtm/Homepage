import { defineCollection, z } from 'astro:content';

const imageField = z.string().optional().default('/images/uploads/lab-hero.png');

const research = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    cover: imageField,
    order: z.number().default(10),
  }),
});

const publications = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    authors: z.array(z.string()).default([]),
    journal: z.string(),
    year: z.number(),
    volume: z.string().optional(),
    pages: z.string().optional(),
    doi: z.string().optional(),
    url: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
    featured: z.boolean().default(false),
    order: z.number().default(10),
  }),
});

const people = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    role: z.string(),
    category: z
      .enum(['principal-investigator', 'researcher', 'alumni', 'collaborator'])
      .optional()
      .default('researcher'),
    group: z.string().optional(),
    email: z.string().optional(),
    website: z.string().optional(),
    photo: z.string().optional().default('/images/uploads/profile-placeholder.svg'),
    education: z.array(z.string()).optional().default([]),
    alumni: z.boolean().default(false),
    order: z.number().default(10),
  }),
});

const facilities = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    category: z.string(),
    image: imageField,
    location: z.string().optional(),
    specs: z.array(z.string()).optional().default([]),
    order: z.number().default(10),
  }),
});

const news = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    cover: imageField,
    featured: z.boolean().default(false),
  }),
});

export const collections = {
  research,
  publications,
  people,
  facilities,
  news,
};
