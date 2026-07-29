import { z } from 'zod';

// KMDb 응답 검증 — spikes/api-feasibility/kmdb-movie.mjs 실호출 스파이크에서 실제로 확인된
// 필드만 스키마에 넣는다. "keywords"처럼 실제 응답에서 검증하지 못한 필드는 넣지 않는다
// (문서 KMDB-INTEGRATION.md 참고 — 추정 금지 원칙).

const director = z.object({ directorNm: z.string().optional().default('') });
const plot = z.object({ plotText: z.string().optional().default('') });

export const kmdbResultItemSchema = z.object({
  DOCID: z.string().min(1),
  title: z.string().optional().default(''),
  titleEng: z.string().optional().default(''),
  prodYear: z.string().optional().default(''),
  runtime: z.string().optional().default(''),
  repRlsDate: z.string().optional().default(''),
  rating: z.string().optional().default(''),
  directors: z
    .object({ director: z.array(director).optional().default([]) })
    .optional()
    .default({ director: [] }),
  plots: z
    .object({ plot: z.array(plot).optional().default([]) })
    .optional()
    .default({ plot: [] }),
  screenArea: z.string().optional().default(''),
  soundEcho: z.string().optional().default(''),
  fSound: z.string().optional().default(''),
});

export const kmdbSearchResponseSchema = z.object({
  Data: z.array(
    z.object({
      Count: z.union([z.string(), z.number()]).optional(),
      Result: z.array(kmdbResultItemSchema).optional().default([]),
    }),
  ),
});

export type KmdbResultItem = z.infer<typeof kmdbResultItemSchema>;
export type KmdbSearchResponse = z.infer<typeof kmdbSearchResponseSchema>;
