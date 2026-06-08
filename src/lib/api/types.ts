/**
 * TypeScript mirror of the Rails JSON API serializers (Api::V1::MemorySerializer
 * and the sessions/devices payloads). Kept explicit so the client is a precise
 * contract; update alongside the serializers.
 */

// ---- Auth ----
export interface AuthUser {
  id: number;
  email: string;
  display_name: string | null;
  companion_name: string;
}

export interface TokenPair {
  access_token: string;
  access_expires_at: string;
  refresh_token: string;
  refresh_expires_at: string;
}

export interface LoginResponse extends TokenPair {
  user: AuthUser;
}

export interface Device {
  id: number;
  name: string;
  current: boolean;
  last_used_at: string | null;
  created_at: string;
  expires_at: string;
}

// ---- Memories ----
export interface Memory {
  id: number;
  title: string | null;
  structured_body: string | null;
  date_label: string | null;
  date_precision: string | null;
  date_confidence: string | null;
  occurred_on: string | null;
  status: string;
  sensitivity: string;
  category: string | null;
  emotional_valence: string | null;
  importance: number | null;
  exclude_from_voice_context: boolean;
  ai_summary: string | null;
  ai_summary_generated_at: string | null;
  original_wording: string | null;
  tags: string[];
  people: string[];
  places: string[];
  life_periods: string[];
  created_at: string;
  updated_at: string;
}

export interface TimelineMemory {
  id: number;
  title: string | null;
  date_label: string | null;
  category: string | null;
  sensitivity: string | null;
}

// Compact memory reference used wherever a screen lists related/linked memories.
export interface MemoryRefLite {
  id: number;
  title: string | null;
  date_label: string | null;
}

export interface LinkedPlace {
  id: number; // the person_place join id (used to unlink)
  place_id: number;
  place_name: string | null;
  relationship_label: string | null;
}

export interface ConnectedPerson {
  id: number; // the person id
  name: string | null;
  relationship_label: string | null;
}

export interface Person {
  id: number;
  name: string;
  relationship_label?: string | null;
  notes?: string | null;
  memory_count?: number;
  // Present on show (person_detail) only.
  linked_places?: LinkedPlace[];
  memories?: MemoryRefLite[];
}

export interface Place {
  id: number;
  name: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  address_freeform?: string | null;
  place_type?: string | null;
  notes?: string | null;
  residence?: boolean;
  memory_count?: number;
  // Present on show (place_detail) only.
  connected_people?: ConnectedPerson[];
  life_periods?: { id: number; name: string }[];
  memories?: MemoryRefLite[];
}

export interface LifePeriod {
  id: number;
  name: string;
  description?: string | null;
  date_range_start: string | null;
  date_range_end: string | null;
  date_confidence?: string | null;
  place_id: number | null;
  place_name?: string | null;
  memory_count?: number;
  // Present on show (life_period_detail) only.
  memories?: MemoryRefLite[];
}

// DB-backed reference option for preference pickers (onboarding + settings).
export interface OptionItem {
  id: number;
  slug: string;
  name: string;
}

export interface ReferenceOptions {
  companion_styles: OptionItem[];
  notification_frequencies: OptionItem[];
  help_focuses: OptionItem[];
  voice_call_modes: OptionItem[];
}

export interface TranscriptSegment {
  id: number;
  speaker: string | null;
  content: string;
  mode: string | null;
  promoted: boolean;
  source_capture_id: number | null;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
  tag_type: string | null;
}

// ---- Companion loop ----
export interface OpenThread {
  id: number;
  kind: string;
  status: string;
  note: string | null;
  summary: string | null;
  resolution_note: string | null;
  suggested_resolution_note: string | null;
  suggested_resolved: boolean;
  uncertainty_type: string | null;
  goal_id: number | null;
  snoozed_until: string | null;
  resolved_at: string | null;
  memory_ids: number[];
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: number;
  title: string;
  description: string | null;
  status: string;
  scoring_mode: string;
  template_slug: string | null;
  template: boolean;
  score_percent: number | null;
  score_yes: boolean | null;
  outcome_comment: string | null;
  closed_at: string | null;
  memory_ids: number[];
  created_at: string;
  updated_at: string;
}

export interface GoalProgress {
  percent: number;
  complete: boolean;
  label: string;
}

export interface AppNotification {
  id: number;
  kind: string;
  message: string;
  link: string | null;
  seen_at: string | null;
  created_at: string;
}

// ---- Life records ----
export interface Employment {
  id: number;
  employer: string;
  title: string | null;
  date_range_start: string | null;
  date_range_end: string | null;
  date_confidence: string | null;
  notes: string | null;
  memory_ids: number[];
  created_at: string;
  updated_at: string;
}

export interface Residency {
  id: number;
  place_id: number;
  place_name: string | null;
  date_range_start: string | null;
  date_range_end: string | null;
  date_confidence: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Reconstruction ----
export interface MemoryRef {
  id: number;
  title: string | null;
  date_label: string | null;
}

export interface TemporalContext {
  earliest: string | null;
  latest: string | null;
  conflicts: string[];
  inferred_range: boolean;
  impossible: boolean;
  befores: MemoryRef[];
  afters: MemoryRef[];
  anchors: { id: number; name: string }[];
}

export interface DateSuggestion {
  fuzzy_date_label: string | null;
  range_start: string | null;
  range_end: string | null;
  confidence: string | null;
  reasoning: string | null;
}

export interface MemoryRelation {
  id: number;
  from_memory_id: number;
  to_memory_id: number;
  to_memory_title: string | null;
  temporal_relation_type: string | null;
  note: string | null;
  created_at: string;
}

// ---- Enrichment / jobs ----
export interface MemoryEnrichment {
  id: number;
  memory_id: number;
  prompt: string;
  response: string | null;
  status: string;
  created_at: string;
}

export interface JobCandidate {
  id: number;
  suggested_title: string | null;
  employer: string | null;
  suggested_start: string | null;
  suggested_end: string | null;
  suggested_confidence: string | null;
  evidence: string | null;
  free_question: string | null;
  status: string;
  source_memory_id: number | null;
  source_memory_title: string | null;
  created_employment_id: number | null;
}

// ---- Capture / split ----
export interface SourceCapture {
  id: number;
  raw_text: string;
  source_type?: string | null;
  status?: string | null;
  candidate_count?: number;
  created_at?: string;
}

export interface CandidateSplitMemory {
  id: number;
  source_capture_id?: number;
  status?: string;
  suggested_title: string | null;
  suggested_body: string | null;
  source_excerpt?: string | null;
  suggested_fuzzy_date_label: string | null;
  suggested_tags?: string[];
  suggested_people?: string[];
  suggested_places?: string[];
  uncertainties?: string[];
}

// ---- Chat ----
export type TurnKind = 'reply' | 'crisis' | 'allowance';

export interface AiMessage {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  kind: TurnKind;
  created_at: string;
}

export interface Conversation {
  id: number;
  title: string | null;
  mode: string | null;
  active_flow: string | null;
  in_flow: boolean;
  message_count?: number;
  memories_created?: number;
  records_updated?: number;
  created_at: string;
  updated_at: string;
}

export interface MemoryUpdateProposal {
  id: number;
  memory_id: number;
  status: string;
  rationale: string | null;
  suggested_title: string | null;
  suggested_body_addition: string | null;
  suggested_fuzzy_date_label: string | null;
  suggested_people: string[];
  suggested_places: string[];
  suggested_tags: string[];
}

export interface ConversationExtras {
  proposed_capture: { id: number } | null;
  pending_candidates: CandidateSplitMemory[];
  update_proposals: MemoryUpdateProposal[];
}

export interface Turn {
  turn: {
    user_message: AiMessage;
    assistant_message: AiMessage | null;
  };
  conversation: Conversation;
  extras: ConversationExtras;
  idempotent_replay: boolean;
}

// ---- Settings / entitlement ----
export interface UserSettings {
  id: number;
  email: string;
  display_name: string | null;
  companion_name: string;
  timezone: string;
  training_opt_in: boolean;
  default_memory_body_source: string;
  enrichment_level: string;
  companion_style_id: number | null;
  notification_frequency_id: number | null;
  default_voice_call_mode_id: number | null;
  help_focus_id: number | null;
  onboarded: boolean;
}

export interface EntitlementSummary {
  plan: string;
  ai_tokens_remaining: number | null;
  allowed: boolean;
}

export interface Entitlement {
  plan: string;
  plan_name: string;
  ai_monthly_token_budget: number | null;
  ai_tokens_used: number;
  ai_tokens_remaining: number | null;
  allowed: boolean;
}

export interface ScanEligibility {
  can_scan: boolean;
  entitled: boolean;
  changed_since_last: boolean;
  reason: string | null;
}

export interface Reflection {
  id: number;
  title: string | null;
  body: string | null;
  ai_generated: boolean;
  created_at: string;
  memory_ids: number[];
}

export interface VoiceSession {
  id: number;
  status: string | null;
  provider: string | null;
  started_at: string | null;
  ended_at: string | null;
  initial_mode: string | null;
  current_mode: string | null;
  segment_count: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'memory' | 'person' | 'place' | 'life_period';
  weight: number;
  url: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  kind: string;
  label: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  truncated: boolean;
}

export interface EgoGraph {
  center: GraphNode | null;
  nodes: GraphNode[];
  edges: GraphEdge[];
  depth: number;
  first_degree_count: number;
  node_count: number;
  truncated: boolean;
  first_degree_overflow: boolean;
  max_nodes: number;
}
