export type Role = 'admin' | 'coordinator' | 'collaborator';
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}
export interface Edition {
  id: string;
  name: string;
  year: number;
  event_date: string;
  location: string;
  status: 'planning' | 'active' | 'archived';
  summary: string;
}
export interface Activity {
  id: string;
  edition_id: string;
  title: string;
  description: string;
  owner_id: string;
  owner_name: string;
  due_date: string;
  status: 'pending' | 'doing' | 'done';
  priority: 'normal' | 'high';
  version: number;
  phase: 'before' | 'during' | 'after';
  stakeholder_id: string | null;
}
export interface Decision {
  id: string;
  title: string;
  rationale: string;
  author_name: string;
  activity_id: string | null;
  activity_title: string | null;
  created_at: string;
  source?: 'application' | 'demo';
}
export interface Sponsor {
  id: string;
  edition_id: string;
  name: string;
  contribution: string;
  counterpart: string;
  contact: string;
  owner_id: string;
  owner_name: string;
  status: 'prospect' | 'contacted' | 'confirmed' | 'delivered';
  notes: string;
  version: number;
}
export interface Stakeholder {
  id: string;
  name: string;
  category: string;
  responsibility: string;
  contact: string;
  edition_id: string;
  owner_id: string | null;
  owner_name: string | null;
  phase: 'before' | 'during' | 'after';
  operational_status: 'scheduled' | 'confirmed' | 'in_progress' | 'finished';
  notes: string;
  version: number;
}
export interface Audit {
  id: number;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_data: unknown;
  after_data: unknown;
  created_at: string;
  source?: 'application' | 'demo';
}
