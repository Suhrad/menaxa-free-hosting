export interface Program {
  id: string;
  name: string;
  url: string;
  platform: string;
  max_bounty: number | null;
}

export interface ProgramsResponse {
  data: Program[];
  total_programs: number;
  platforms: string[];
} 