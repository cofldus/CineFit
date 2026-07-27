import { z } from 'zod';

// KOBIS 응답 검증 — 필요한 필드만 관용적으로 파싱 (누락은 기본값, 형식 오류는 실패)

export const kobisFaultSchema = z.object({
  faultInfo: z.object({ message: z.string(), errorCode: z.string().optional() }).optional(),
});

export const boxOfficeResponseSchema = z.object({
  boxOfficeResult: z.object({
    dailyBoxOfficeList: z
      .array(
        z.object({
          movieCd: z.string().min(1),
          movieNm: z.string().min(1),
          openDt: z.string().optional().default(''),
          rank: z.string().optional().default(''),
        }),
      )
      .default([]),
  }),
});

export const movieInfoResponseSchema = z.object({
  movieInfoResult: z.object({
    movieInfo: z.object({
      movieCd: z.string().min(1),
      movieNm: z.string().min(1),
      movieNmEn: z.string().optional().default(''),
      showTm: z.string().optional().default(''),
      prdtYear: z.string().optional().default(''),
      openDt: z.string().optional().default(''),
      genres: z.array(z.object({ genreNm: z.string() })).optional().default([]),
      directors: z.array(z.object({ peopleNm: z.string() })).optional().default([]),
      audits: z.array(z.object({ watchGradeNm: z.string() })).optional().default([]),
      showTypes: z
        .array(z.object({ showTypeGroupNm: z.string().default(''), showTypeNm: z.string().default('') }))
        .optional()
        .default([]),
    }),
  }),
});

export type BoxOfficeResponse = z.infer<typeof boxOfficeResponseSchema>;
export type MovieInfoResponse = z.infer<typeof movieInfoResponseSchema>;
