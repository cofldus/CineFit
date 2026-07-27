import { getDb } from './db';

export interface AuditoriumOption {
  id: number;
  label: string; // "CGV 용산아이파크몰 IMAX관"
  brand: string;
  locationName: string;
  locationStatus: string;
}

export const cinemaRepository = {
  listAuditoriums(): AuditoriumOption[] {
    const rows = getDb()
      .prepare(
        `SELECT a.id, a.auditorium_no, a.brand, l.name AS loc_name, l.status AS loc_status
         FROM auditoriums a JOIN cinema_locations l ON l.id = a.location_id
         ORDER BY l.name, a.auditorium_no`,
      )
      .all() as unknown as {
      id: number;
      auditorium_no: string;
      brand: string;
      loc_name: string;
      loc_status: string;
    }[];
    return rows.map((r) => ({
      id: r.id,
      label: `${r.loc_name} ${r.auditorium_no}`,
      brand: r.brand,
      locationName: r.loc_name,
      locationStatus: r.loc_status,
    }));
  },

  findAuditorium(id: number): AuditoriumOption | null {
    return this.listAuditoriums().find((a) => a.id === id) ?? null;
  },
};
