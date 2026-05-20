import {z} from 'zod';

export const watchlistSchema = z.array(z.string().trim().min(1));

export type Watchlist = z.infer<typeof watchlistSchema>;
