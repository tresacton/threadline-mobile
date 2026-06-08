import { api } from './client';
import type {
  AppNotification,
  CandidateSplitMemory,
  Conversation,
  DateSuggestion,
  Device,
  Employment,
  EgoGraph,
  Entitlement,
  Goal,
  GoalProgress,
  GraphData,
  JobCandidate,
  LifePeriod,
  Memory,
  MemoryEnrichment,
  MemoryRelation,
  OpenThread,
  Person,
  Place,
  Reflection,
  Residency,
  ScanEligibility,
  SourceCapture,
  Tag,
  TemporalContext,
  TimelineMemory,
  Turn,
  UserSettings,
  VoiceSession,
} from './types';

// ---- Memories ----
export const Memories = {
  list: () => api.get<{ memories: Memory[] }>('/memories').then((r) => r.memories),
  get: (id: number) => api.get<{ memory: Memory }>(`/memories/${id}`).then((r) => r.memory),
  search: (q: string) =>
    api.get<{ memories: Memory[] }>('/memories/search', { q }).then((r) => r.memories),
  related: (id: number) =>
    api.get<{ memories: Memory[] }>(`/memories/${id}/related`).then((r) => r.memories),
  create: (memory: Partial<Memory> & { raw_text?: string }) =>
    api.post<{ memory: Memory }>('/memories', { memory }).then((r) => r.memory),
  update: (id: number, memory: Partial<Memory>) =>
    api.patch<{ memory: Memory }>(`/memories/${id}`, { memory }).then((r) => r.memory),
  remove: (id: number) => api.delete<void>(`/memories/${id}`),
  setSensitivity: (id: number, sensitivity_slug: string) =>
    api
      .patch<{ memory: Memory }>(`/memories/${id}/sensitivity`, { memory: { sensitivity_slug } })
      .then((r) => r.memory),
  summarise: (id: number) => api.post<{ status: string }>(`/memories/${id}/summarise`),
  reconstruct: (id: number) =>
    api.get<{ temporal_context: TemporalContext; relations: MemoryRelation[] }>(`/memories/${id}/reconstruct`),
  suggestDate: (id: number) =>
    api.post<{ date_suggestion: DateSuggestion }>(`/memories/${id}/suggest_date`).then((r) => r.date_suggestion),
  split: (id: number) =>
    api.post<{ source_capture: SourceCapture }>(`/memories/${id}/split`).then((r) => r.source_capture),
  addRelation: (id: number, to_memory_id: number, temporal_relation_slug: string, note?: string) =>
    api
      .post<{ memory_relation: MemoryRelation }>(`/memories/${id}/memory_relations`, {
        to_memory_id,
        temporal_relation_slug,
        note,
      })
      .then((r) => r.memory_relation),
  removeRelation: (memoryId: number, relationId: number) =>
    api.delete<void>(`/memories/${memoryId}/memory_relations/${relationId}`),
};

// ---- People / Places / Life periods / Tags ----
export const People = {
  list: () => api.get<{ people: Person[] }>('/people').then((r) => r.people),
  get: (id: number) => api.get<{ person: Person }>(`/people/${id}`).then((r) => r.person),
  create: (person: Partial<Person>) =>
    api.post<{ person: Person }>('/people', { person }).then((r) => r.person),
  update: (id: number, person: Partial<Person>) =>
    api.patch<{ person: Person }>(`/people/${id}`, { person }).then((r) => r.person),
  remove: (id: number) => api.delete<void>(`/people/${id}`),
};

export const Places = {
  list: () => api.get<{ places: Place[] }>('/places').then((r) => r.places),
  get: (id: number) => api.get<{ place: Place }>(`/places/${id}`).then((r) => r.place),
  create: (place: Partial<Place>) =>
    api.post<{ place: Place }>('/places', { place }).then((r) => r.place),
  update: (id: number, place: Partial<Place>) =>
    api.patch<{ place: Place }>(`/places/${id}`, { place }).then((r) => r.place),
  remove: (id: number) => api.delete<void>(`/places/${id}`),
};

export const LifePeriods = {
  list: () => api.get<{ life_periods: LifePeriod[] }>('/life_periods').then((r) => r.life_periods),
  create: (life_period: Partial<LifePeriod>) =>
    api.post<{ life_period: LifePeriod }>('/life_periods', { life_period }).then((r) => r.life_period),
  update: (id: number, life_period: Partial<LifePeriod>) =>
    api.patch<{ life_period: LifePeriod }>(`/life_periods/${id}`, { life_period }).then((r) => r.life_period),
  remove: (id: number) => api.delete<void>(`/life_periods/${id}`),
};

export const Tags = {
  list: () => api.get<{ tags: Tag[] }>('/tags').then((r) => r.tags),
};

// ---- Open threads ----
export const OpenThreads = {
  list: (memoryId?: number) =>
    api.get<{ open_threads: OpenThread[] }>('/open_threads', { memory_id: memoryId }).then((r) => r.open_threads),
  transition: (id: number, action: 'resolve' | 'keep' | 'snooze' | 'set_aside') =>
    api.post<{ open_thread: OpenThread }>(`/open_threads/${id}/${action}`).then((r) => r.open_thread),
};

// ---- Goals ----
export const Goals = {
  list: (status?: 'active' | 'closed') =>
    api.get<{ goals: Goal[] }>('/goals', { status }).then((r) => r.goals),
  get: (id: number) =>
    api.get<{ goal: Goal; progress?: GoalProgress }>(`/goals/${id}`),
  create: (goal: Partial<Goal>) => api.post<{ goal: Goal }>('/goals', { goal }).then((r) => r.goal),
  update: (id: number, goal: Partial<Goal>) =>
    api.patch<{ goal: Goal }>(`/goals/${id}`, { goal }).then((r) => r.goal),
  remove: (id: number) => api.delete<void>(`/goals/${id}`),
  close: (id: number, goal: { score_yes?: boolean; score_percent?: number; outcome_comment?: string }) =>
    api.post<{ goal: Goal }>(`/goals/${id}/close`, { goal }).then((r) => r.goal),
  link: (id: number, memory_id: number) =>
    api.post<{ goal: Goal }>(`/goals/${id}/link`, { memory_id }).then((r) => r.goal),
  unlink: (id: number, memory_id: number) =>
    api.delete<{ goal: Goal }>(`/goals/${id}/unlink`, { body: { memory_id } }).then((r) => r.goal),
};

// ---- Notifications ----
export const Notifications = {
  list: () =>
    api.get<{ notifications: AppNotification[]; unseen_count: number }>('/notifications'),
  markSeen: () => api.post<void>('/notifications/mark_seen'),
};

// ---- Employments / Residencies ----
export const Employments = {
  list: () => api.get<{ employments: Employment[] }>('/employments').then((r) => r.employments),
  create: (employment: Partial<Employment> & { date_confidence_slug?: string }) =>
    api.post<{ employment: Employment }>('/employments', { employment }).then((r) => r.employment),
  update: (id: number, employment: Partial<Employment> & { date_confidence_slug?: string }) =>
    api.patch<{ employment: Employment }>(`/employments/${id}`, { employment }).then((r) => r.employment),
  remove: (id: number) => api.delete<void>(`/employments/${id}`),
};

export const Residencies = {
  list: () => api.get<{ residencies: Residency[] }>('/residencies').then((r) => r.residencies),
  create: (residency: Partial<Residency> & { date_confidence_slug?: string }) =>
    api.post<{ residency: Residency }>('/residencies', { residency }).then((r) => r.residency),
  update: (id: number, residency: Partial<Residency> & { date_confidence_slug?: string }) =>
    api.patch<{ residency: Residency }>(`/residencies/${id}`, { residency }).then((r) => r.residency),
  remove: (id: number) => api.delete<void>(`/residencies/${id}`),
};

// ---- Enrichment ----
export const Enrichment = {
  list: (memoryId: number) =>
    api.get<{ pending: MemoryEnrichment[]; answered: MemoryEnrichment[] }>(
      `/memories/${memoryId}/enrichments`,
    ),
  generate: (memoryId: number) =>
    api.post<{ pending: MemoryEnrichment[] }>(`/memories/${memoryId}/enrichments/generate`),
  answer: (id: number, response: string) =>
    api
      .patch<{ enrichment: MemoryEnrichment }>(`/memory_enrichments/${id}`, { enrichment: { response } })
      .then((r) => r.enrichment),
  skip: (id: number) =>
    api.post<{ enrichment: MemoryEnrichment }>(`/memory_enrichments/${id}/skip`).then((r) => r.enrichment),
};

// ---- Job finder ----
export const JobFinder = {
  show: () =>
    api.get<{ candidate: JobCandidate | null; remaining: number; recorded: number }>('/job_finder'),
  discover: () =>
    api.post<{ found: number; candidates: JobCandidate[] }>('/job_finder/discover'),
  record: (id: number, job: Record<string, string | undefined>) =>
    api.patch<{ employment: Employment }>(`/job_candidates/${id}`, { job }).then((r) => r.employment),
  skip: (id: number) =>
    api.post<{ candidate: JobCandidate }>(`/job_candidates/${id}/skip`).then((r) => r.candidate),
};

// ---- Captures / split candidates ----
export const Captures = {
  pending: () =>
    api.get<{ source_captures: SourceCapture[] }>('/source_captures').then((r) => r.source_captures),
  get: (id: number) => api.get<{ source_capture: SourceCapture }>(`/source_captures/${id}`).then((r) => r.source_capture),
  create: (raw_text: string, source_type_slug?: string) =>
    api
      .post<{ source_capture: SourceCapture }>('/source_captures', {
        source_capture: { raw_text, source_type_slug },
      })
      .then((r) => r.source_capture),
  suggestSplits: (id: number) => api.post<{ status: string }>(`/source_captures/${id}/suggest_splits`),
  candidates: (id: number) =>
    api
      .get<{ candidate_split_memories: CandidateSplitMemory[] }>(
        `/source_captures/${id}/candidate_split_memories`,
      )
      .then((r) => r.candidate_split_memories),
  keepAsOne: (id: number) =>
    api.post<{ memory: Memory }>(`/source_captures/${id}/keep_as_one`).then((r) => r.memory),
  remove: (id: number) => api.delete<void>(`/source_captures/${id}`),
};

export const Candidates = {
  update: (id: number, fields: Partial<CandidateSplitMemory>) =>
    api
      .patch<{ candidate_split_memory: CandidateSplitMemory }>(`/candidate_split_memories/${id}`, {
        candidate_split_memory: fields,
      })
      .then((r) => r.candidate_split_memory),
  accept: (id: number, fields?: Partial<CandidateSplitMemory>) =>
    api
      .post<{ memory: Memory }>(`/candidate_split_memories/${id}/accept`, {
        candidate_split_memory: fields ?? {},
      })
      .then((r) => r.memory),
  reject: (id: number) => api.delete<void>(`/candidate_split_memories/${id}/reject`).catch(() => undefined),
};

// ---- Chat ----
export const Chat = {
  list: () => api.get<{ conversations: Conversation[] }>('/conversations').then((r) => r.conversations),
  get: (id: number) =>
    api.get<{ conversation: Conversation; messages: import('./types').AiMessage[]; extras: import('./types').ConversationExtras }>(
      `/conversations/${id}`,
    ),
  create: (voice_call_mode_slug?: string) =>
    api.post<{ conversation: Conversation }>('/conversations', { voice_call_mode_slug }).then((r) => r.conversation),
  setMode: (id: number, voice_call_mode_slug: string) =>
    api.patch<{ conversation: Conversation }>(`/conversations/${id}/mode`, { voice_call_mode_slug }).then((r) => r.conversation),
  sendMessage: (id: number, content: string, clientToken: string) =>
    api.post<Turn>(`/conversations/${id}/messages`, { content }, { idempotencyKey: clientToken }),
  saveMemory: (id: number) =>
    api.post<{ source_capture: SourceCapture }>(`/conversations/${id}/save_memory`).then((r) => r.source_capture),
};

// ---- Timeline / settings / scans / exports / devices / account ----
export const Timeline = {
  show: (params?: { order?: 'oldest' | 'newest'; person_id?: number; place_id?: number; tag_id?: number; life_period_id?: number; valence_slug?: string }) =>
    api.get<{ order: string; years: { year: number; memories: TimelineMemory[] }[]; fuzzy: TimelineMemory[] }>(
      '/timeline',
      params,
    ),
};

export const Settings = {
  get: () => api.get<{ settings: UserSettings; entitlement: { plan: string; ai_tokens_remaining: number | null; allowed: boolean } }>('/settings'),
  update: (user: Partial<UserSettings>) =>
    api.patch<{ settings: UserSettings }>('/settings', { user }).then((r) => r.settings),
};

export const Entitlements = {
  get: () => api.get<Entitlement>('/entitlement'),
};

export const Scans = {
  eligibility: () => api.get<{ eligibility: ScanEligibility }>('/scans/eligibility').then((r) => r.eligibility),
  run: () => api.post<{ status: string }>('/scans'),
};

export const Devices = {
  list: () => api.get<{ devices: Device[] }>('/devices').then((r) => r.devices),
  revoke: (id: number) => api.delete<void>(`/devices/${id}`),
};

export const Account = {
  destroy: () => api.delete<void>('/account', { body: { confirm: true } }),
};

export const Reflections = {
  list: () => api.get<{ reflections: Reflection[] }>('/reflections').then((r) => r.reflections),
  get: (id: number) => api.get<{ reflection: Reflection }>(`/reflections/${id}`).then((r) => r.reflection),
  create: (question: string) =>
    api.post<{ reflection: Reflection }>('/reflections', { question }).then((r) => r.reflection),
};

export const Voice = {
  list: () => api.get<{ voice_sessions: VoiceSession[] }>('/voice_sessions').then((r) => r.voice_sessions),
};

export const Graph = {
  get: () => api.get<GraphData>('/graph'),
  ego: (centerId: string) => api.get<EgoGraph>('/graph', { center: centerId }),
};
