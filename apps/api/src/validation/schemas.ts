import { z } from 'zod';
import { ALLOWED_FIRMS_SOURCES } from '@ofw/simulation';

/** Maximum bbox extent per side (degrees). Keeps queries bounded; never "world". */
export const MAX_BBOX_SPAN_DEG = 20;
export const MIN_DAY_RANGE = 1;
export const MAX_DAY_RANGE = 5;

const coord = (min: number, max: number) => z.coerce.number().finite().min(min).max(max);

/** Every check except the span limit (used to recognise exact bundled-snapshot requests). */
export const firmsAreaBaseSchema = z
  .object({
    source: z.enum(ALLOWED_FIRMS_SOURCES).default('VIIRS_NOAA20_NRT'),
    west: coord(-180, 180),
    south: coord(-90, 90),
    east: coord(-180, 180),
    north: coord(-90, 90),
    dayRange: z.coerce.number().int().min(MIN_DAY_RANGE).max(MAX_DAY_RANGE).default(1),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
      .optional(),
    refresh: z.enum(['0', '1']).optional(),
  })
  .superRefine((q, ctx) => {
    if (q.west >= q.east) ctx.addIssue({ code: 'custom', message: 'west must be less than east (antimeridian-crossing boxes are not supported)', path: ['west'] });
    if (q.south >= q.north) ctx.addIssue({ code: 'custom', message: 'south must be less than north', path: ['south'] });
    if (q.date) {
      const t = Date.parse(q.date + 'T00:00:00Z');
      if (!Number.isFinite(t)) ctx.addIssue({ code: 'custom', message: 'invalid date', path: ['date'] });
      else if (t > Date.now() + 86400000) ctx.addIssue({ code: 'custom', message: 'date is in the future', path: ['date'] });
    }
  });

/** Queries that may reach NASA FIRMS are bounded to MAX_BBOX_SPAN_DEG per side. */
export const firmsAreaQuerySchema = firmsAreaBaseSchema.superRefine((q, ctx) => {
  if (q.east - q.west > MAX_BBOX_SPAN_DEG || q.north - q.south > MAX_BBOX_SPAN_DEG) {
    ctx.addIssue({ code: 'custom', message: `bounding box may span at most ${MAX_BBOX_SPAN_DEG}° per side`, path: ['east'] });
  }
});

export type FirmsAreaQuery = z.infer<typeof firmsAreaQuerySchema>;
