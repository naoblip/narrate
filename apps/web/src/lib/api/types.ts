export type WorldData = {
  world: Array<{
    name: string;
    description: string;
    connected_to: string[];
    locations: Array<{
      name: string;
      description: string;
      places: Array<{
        name: string;
        description: string;
      }>;
    }>;
  }>;
  character_options: Record<string, unknown>;
  starting_position: {
    region: string;
    location: string;
    place: string;
  };
};

export type ActivityItem = {
  id: string;
  agent_id: string;
  agent_name: string | null;
  statement: string;
  created_at: string;
  region: string;
  location: string;
  place: string;
  shared_with: unknown[];
  activity_type: "dialogue" | "movement" | "event";
  is_event: boolean;
};

export type ActivityResponse = {
  activity: ActivityItem[];
  next_cursor?: string;
};

export type AgentsResponse = {
  agents: Array<{
    id: string;
    name: string;
    species: string;
    traits: string[];
    inventory: Record<string, string | null>;
    region: string;
    location: string;
    place: string;
    created_at: string;
  }>;
  next_cursor?: string;
};

export type SummaryResponse = {
  summary: null | {
    summary: string;
    generated_at: string;
    activity_count: number;
    source_statements: unknown;
  };
};
