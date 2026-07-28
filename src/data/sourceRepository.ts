import { getAppDbClient } from './client/index';
import type { DbClient } from './client/types';

export interface SourceRow {
  id: number;
  kind: string;
  name: string;
  url: string | null;
  terms_note: string | null;
  trust_weight: number;
}

export function createSourceRepository(getDb: () => DbClient) {
  return {
    async list(): Promise<SourceRow[]> {
      return getDb().query<SourceRow>(
        `SELECT id, kind, name, url, terms_note, trust_weight FROM sources ORDER BY trust_weight DESC`,
      );
    },

    /** 이름으로 조회, 없으면 생성 — 승격 파이프라인 공용 */
    async getOrCreate(
      kind: string,
      name: string,
      trustWeight: number,
      db: DbClient = getDb(),
    ): Promise<number> {
      const existing = await db.query<{ id: number }>(`SELECT id FROM sources WHERE name = ?`, [name]);
      if (existing[0]) return existing[0].id;
      const rows = await db.query<{ id: number }>(
        `INSERT INTO sources (kind, name, trust_weight) VALUES (?,?,?) RETURNING id`,
        [kind, name, trustWeight],
      );
      return rows[0].id;
    },
  };
}

export const sourceRepository = createSourceRepository(getAppDbClient);
