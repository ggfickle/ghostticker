import {z} from 'zod';

export const preferencesSchema = z.object({
  refreshSeconds: z.number().int().positive().default(5),
  defaultMode: z.literal('quiet').default('quiet')
});

export type Preferences = z.infer<typeof preferencesSchema>;
