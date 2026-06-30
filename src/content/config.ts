import { defineCollection, z } from 'astro:content';

const imageField = z.string().optional().default('/images/uploads/lab-hero.png');
const specItem = z
  .union([z.string(), z.object({ spec: z.string() }), z.record(z.union([z.string(), z.number(), z.boolean()]))])
  .transform((value) => {
    if (typeof value === 'string') return value;
    if ('spec' in value) return value.spec;
    return Object.entries(value)
      .map(([key, entry]) => `${key}: ${entry}`)
      .join(', ');
  });

const research = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    order: z.number().default(10),
  }),
});

const publications = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    authors: z
      .array(
        z.union([
          z.string(),
          z.object({
            name: z.string(),
            labMember: z.boolean().optional().default(false),
            corresponding: z.boolean().optional().default(false),
          }),
        ])
      )
      .default([]),
    journal: z.string(),
    year: z.union([z.number(), z.string()]).optional().default(''),
    volume: z.string().optional(),
    pages: z.string().optional(),
    doi: z.string().optional(),
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

const pi = defineCollection({
  type: 'content',
  schema: z.object({
    label: z.string().default('Principal Investigator'),
    name: z.string(),
    title: z.string(),
    department: z.string(),
    institution: z.string(),
    location: z.string(),
    email: z.string().email(),
    scholarUrl: z.string().url().optional(),
    photo: z.string().optional().default('/images/uploads/profile-placeholder.svg'),
    education: z.array(z.string()).optional().default([]),
    researchExperience: z
      .array(
        z.object({
          position: z.string(),
          period: z.string(),
          affiliation: z.string(),
        })
      )
      .optional()
      .default([]),
    representativePublications: z.array(z.string()).optional().default([]),
  }),
});

const facilities = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    section: z.enum(['tem-fib', 'in-situ-holder']).optional().default('tem-fib'),
    category: z.string(),
    image: imageField,
    location: z.string().optional(),
    specs: z.array(specItem).optional().default([]),
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
  pi,
  facilities,
  news,
};
