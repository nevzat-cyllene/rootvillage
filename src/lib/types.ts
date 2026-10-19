export type UserRole = "member" | "admin";

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
};

export type Village = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  family_count?: number;
};

export type Family = {
  id: string;
  village_id: string;
  name: string;
  aka: string | null;
  notes: string | null;
  is_incomplete: boolean;
  disputed: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  people_count?: number;
};

export type Person = {
  id: string;
  family_id: string;
  full_name: string;
  birth_year: number | null;
  death_year: number | null;
  gender: "male" | "female" | "other" | "unknown" | null;
  notes: string | null;
  disputed: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type PersonRelation = {
  id: string;
  person_id: string;
  related_person_id: string;
  relation_type: "parent" | "spouse";
};

export type CommentTarget = "village" | "family" | "person";

export type Comment = {
  id: string;
  target_type: CommentTarget;
  target_id: string;
  body: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  author?: Profile | null;
};

export type EditProposal = {
  id: string;
  target_type: "village" | "family" | "person" | "relation";
  target_id: string;
  action: "update" | "delete";
  payload: Record<string, unknown> | null;
  reason: string | null;
  status: "pending" | "accepted" | "rejected";
  proposed_by: string;
  resolved_by: string | null;
  created_at: string;
  resolved_at: string | null;
};
