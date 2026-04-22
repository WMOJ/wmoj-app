export type ContestStatus = 'upcoming' | 'ongoing' | 'virtual' | 'inactive';

export interface Contest {
  id: string;
  name: string;
  description: string | null;
  length: number;
  created_at: string | null;
  updated_at: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  is_rated: boolean;
  created_by: string | null;
  // Added at runtime (not necessarily persisted columns) for listing enrichment
  participants_count?: number;
  problems_count?: number;
}
