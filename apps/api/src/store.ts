import type { ScorecardRecord } from '@repsignal/schema';

/** Minimal persistence seam. The default is an in-memory map; swapping in SQLite or a file store would not touch the routes. */
export interface ScorecardStore {
  save(record: ScorecardRecord): void;
  get(id: string): ScorecardRecord | undefined;
  count(): number;
}

export function createInMemoryStore(): ScorecardStore {
  const records = new Map<string, ScorecardRecord>();
  return {
    save(record) {
      records.set(record.id, record);
    },
    get(id) {
      return records.get(id);
    },
    count() {
      return records.size;
    },
  };
}
