// Hand-written types for the columns Milestone 1 actually touches — not
// full Supabase codegen (that's a reasonable later upgrade once the
// Supabase CLI is linked, not a blocker now).

export type FishSubType =
  | 'common'
  | 'mirror'
  | 'linear'
  | 'fully_scaled'
  | 'leather'
  | 'grass'
  | 'koi'
  | 'ghost';

export type Lake = {
  id: string;
  owner_id: string;
  group_id: string | null;
  name: string;
  latitude: number | null;
  longitude: number | null;
  publicity_policy: 'open' | 'no_publicity';
  created_at: string;
  updated_at: string;
};

export type Catch = {
  id: string;
  owner_id: string;
  lake_id: string | null;
  occurred_at: string;
  weight_grams: number | null;
  swim_peg: string | null;
  sub_type: FishSubType | null;
  rig_used: string | null;
  hookbait: string | null;
  hook_pattern_size: string | null;
  baiting_strategy: string | null;
  wraps_or_distance: string | null;
  air_temp_c: number | null;
  air_pressure_hpa: number | null;
  wind_direction: number | null;
  wind_speed: number | null;
  moon_phase: number | null;
  bottom_type: string | null;
  water_temp_c: number | null;
  duration_hours: number | null;
  session_notes: string | null;
  story: string | null;
  created_at: string;
  updated_at: string;
};

export type CatchPhoto = {
  id: string;
  catch_id: string;
  storage_path_original: string;
  storage_path_display: string;
  width: number | null;
  height: number | null;
  position: number;
  created_at: string;
};

export type CatchWithPhotos = Catch & {
  catch_photos: CatchPhoto[];
  lakes: Pick<Lake, 'id' | 'name'> | null;
};

export type Swim = {
  id: string;
  lake_id: string;
  name: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Spot = {
  id: string;
  lake_id: string;
  swim_id: string | null;
  created_by: string | null;
  name: string | null;
  far_bank_marker: string | null;
  bearing_degrees: number | null;
  rod_length_ft: number | null;
  distance_wraps: number | null;
  distance_estimate_m: number | null;
  depth_m: number | null;
  bottom_type: string | null;
  notes: string | null;
  visibility: 'private' | 'group';
  created_at: string;
  updated_at: string;
};

export type SpotWithLake = Spot & {
  lakes: Pick<Lake, 'id' | 'name'> | null;
  swims: Pick<Swim, 'id' | 'name'> | null;
};
