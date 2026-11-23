/**
 * Lore content schema. Every lore card in the UI is one PlaceContent entry.
 * Rules (enforced by content.test.ts and docs/CONTENT_GUIDE.md):
 *   - id must be a landmark, region or river id from src/world/layout.ts
 *   - quotes ≤ 25 words each, ≤ 2 per place, always with a page (fair-use commentary, not reproduction)
 *   - prose is our own paraphrase, present tense for places, past tense for events
 *   - pages are PDF page numbers of the reference edition (see docs/research/institute-canon.md)
 */
import { z } from 'zod';

export const Season = z.enum(['summer', 'winter', 'thaw', 'any']);

export const PlaceContent = z.object({
  id: z.string(),
  /** Display title, e.g. "Mars Castle". */
  title: z.string().min(2),
  /** One short line under the title, e.g. "Seat of House Mars". */
  subtitle: z.string().min(2).max(60),
  confidence: z.enum(['canon', 'inferred', 'invented']),
  /** 1–2 sentence teaser for hover cards and the place list. ≤ 220 chars. */
  summary: z.string().min(20).max(220),
  /** 1–3 short paragraphs describing the place as the book does. */
  description: z.array(z.string().min(40)).min(1).max(3),
  /** Quick facts table rows, e.g. { label: 'Walls', value: '30 m, on 80 m cliffs' }. */
  facts: z.array(z.object({ label: z.string(), value: z.string() })).max(6),
  /** What happens here in Book 1, in story order. Spoilers allowed (audience: readers of Book 1). */
  events: z.array(z.object({ season: Season, text: z.string().min(10).max(240) })).max(6),
  quotes: z
    .array(
      z.object({
        text: z.string().refine((t) => t.trim().split(/\s+/).length <= 25, 'quotes must be ≤ 25 words'),
        page: z.number().int().positive(),
      }),
    )
    .max(2),
  /** Where this place is discussed, for the "Sources" footer. */
  pages: z.array(z.number().int().positive()).min(1),
  /** If confidence is 'inferred', the reasoning shown to users ("Why here?"). */
  inference: z.string().optional(),
  /** Other place ids worth visiting next. */
  related: z.array(z.string()).max(4),
});

export type PlaceContent = z.infer<typeof PlaceContent>;

/**
 * Per-House lore (src/content/houses.ts). Book 1 only; every fact carries PDF page numbers.
 * Only the Proctor of Mars (Fitchner) is named in Book 1; other Proctors are known by their House name,
 * so `proctor` is optional and `proctorNote` describes what the book shows of them.
 */
export const HouseContent = z.object({
  /** HouseId from src/world/houses.ts. */
  id: z.string(),
  /** The Proctor's name, only if Book 1 gives one. */
  proctor: z.string().optional(),
  /** One line on the Proctor, if the book shows anything about them. */
  proctorNote: z.string().min(10).max(200).optional(),
  /** Notable students named in Book 1 (0-6: some Houses have no named student). */
  students: z
    .array(
      z.object({
        name: z.string().min(2),
        /** One line on who they are and what Book 1 reveals about them. */
        note: z.string().min(10).max(180),
        /** PDF page where the note is supported. */
        page: z.number().int().positive(),
      }),
    )
    .max(6),
  /** What happens to the House in Book 1, 1-3 sentences. Spoilers allowed. */
  fate: z.string().min(20).max(500),
  pages: z.array(z.number().int().positive()).min(1),
});

export type HouseContent = z.infer<typeof HouseContent>;
