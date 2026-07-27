import { getDb } from './db';

export interface SourceRow {
  id: number;
  kind: string;
  name: string;
  url: string | null;
  terms_note: string | null;
  trust_weight: number;
}

export const sourceRepository = {
  list(): SourceRow[] {
    return getDb()
      .prepare(`SELECT id, kind, name, url, terms_note, trust_weight FROM sources ORDER BY trust_weight DESC`)
      .all() as unknown as SourceRow[];
  },
};
