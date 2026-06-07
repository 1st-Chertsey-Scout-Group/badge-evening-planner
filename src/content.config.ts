import { defineCollection, reference } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

// Requirement refs are arrays of ids into the requirements collection; a bad
// ref fails the build.
const reqRefs = z.array(reference('requirements'))

const requirements = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/requirements' }),
  schema: z.object({
    badge: reference('badges'),
    parent: reference('requirements').nullable(),
    children: reqRefs,
    title: z.string(),
    notes: z.string(),
    optional: z.boolean(),
    repeatTimes: z.number().int().positive(),
    // "do all of children" or "do N of children"
    requiredOfChildren: z.union([z.literal('all'), z.number().int().positive()]),
  }),
})

const badges = defineCollection({
  loader: glob({
    pattern: '*/index.json',
    base: './src/content/badges',
    generateId: ({ entry }) => entry.replace(/\/index\.json$/, ''),
  }),
  schema: ({ image }) =>
    z.object({
      slug: z.string(),
      type: z.enum(['activity', 'staged', 'challenge', 'top']),
      badgeType: z.string(),
      title: z.string(),
      description: z.string(),
      versionDate: z.string(),
      sourceUrl: z.url(),
      sections: z.array(z.string()),
      settings: z.array(z.string()),
      activityTypes: z.array(z.string()),
      outcomes: z.array(z.object({ label: z.string(), description: z.string() })),
      tips: z.array(z.object({ title: z.string(), details: z.string() })),
      relatedBadges: z.array(z.object({ title: z.string(), url: z.string() })),
      safetyAlert: z.string().nullable(),
      youthShapedSuggestions: z.string().nullable(),
      supportedBy: z
        .object({
          title: z.string(),
          url: z.string().nullable(),
          logoUrl: z.string().nullable(),
        })
        .nullable(),
      image: z.object({ src: image(), alt: z.string() }),
      // normal badges (activity / challenge / top)
      requirementsIntro: z.string().optional(),
      optionsIntro: z.string().optional(),
      optionsToQualify: z.number().int().nonnegative().optional(),
      mandatory: reqRefs.optional(),
      optional: reqRefs.optional(),
      // staged badges
      displayTitle: z.string().optional(),
      stages: z
        .array(
          z.object({
            label: z.string(),
            threshold: z.number().int().nonnegative(),
            requirementsIntro: z.string(),
            optionsIntro: z.string(),
            mandatory: reqRefs,
            optional: reqRefs,
          }),
        )
        .optional(),
    }),
})

// A base is an activity run on an evening. It covers leaf requirements (across
// any badge); the markdown body holds the run instructions. reference() checks
// the ids exist; the leaf check lives in resolveBases (a non-leaf ref fails the
// build there).
const bases = defineCollection({
  loader: glob({
    pattern: '*/index.md',
    base: './src/content/bases',
    generateId: ({ entry }) => entry.replace(/\/index\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    duration: z.number().int().positive(),
    equipment: z.array(z.string()),
    tags: z.array(z.string()),
    requirements: reqRefs,
  }),
})

export const collections = { badges, requirements, bases }
