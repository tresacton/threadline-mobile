import type { SelectOption } from '@/components/ui/Select';

const titleize = (slug: string) => slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const opt = (slug: string): SelectOption<string> => ({ value: slug, label: titleize(slug) });

export const SENSITIVITY_OPTIONS: SelectOption<string>[] = [
  'normal',
  'sensitive',
  'highly_sensitive',
].map(opt);

export const CATEGORY_OPTIONS: SelectOption<string>[] = [
  'key_life_event',
  'residence',
  'education',
  'work',
  'relationship',
  'family',
  'travel',
  'health',
  'milestone',
  'event',
].map(opt);

export const BODY_SOURCE_OPTIONS: SelectOption<string>[] = [
  { value: 'ai', label: 'AI-polished' },
  { value: 'verbatim', label: 'My exact words' },
];

export const ENRICHMENT_LEVEL_OPTIONS: SelectOption<string>[] = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'practical', label: 'Practical' },
  { value: 'deep', label: 'Deep' },
];

// Built-in goal templates with auto-tracked progress (Goals::Progress).
export const GOAL_TEMPLATE_OPTIONS: SelectOption<string>[] = [
  { value: '', label: 'Freeform' },
  { value: 'residences', label: 'Map my residences' },
  { value: 'career_history', label: 'Map my career' },
  { value: 'enrich_memories', label: 'Enrich my memories' },
];

// How precisely the date is known (date_precision_level slugs).
export const DATE_PRECISION_OPTIONS: SelectOption<string>[] = [
  { value: 'exact_date', label: 'Exact date' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'range', label: 'A range' },
  { value: 'life_period', label: 'A life period' },
  { value: 'unknown', label: 'Not sure' },
];

// How the memory felt (emotional_valence slugs).
export const VALENCE_OPTIONS: SelectOption<string>[] = [
  { value: 'very_negative', label: 'Very hard' },
  { value: 'negative', label: 'Hard' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'positive', label: 'Good' },
  { value: 'very_positive', label: 'Wonderful' },
];

export const DATE_CONFIDENCE_OPTIONS: SelectOption<string>[] = [
  'certain',
  'likely',
  'rough',
  'guess',
  'unknown',
].map(opt);

// How this memory relates in time to another memory (temporal_relation_type).
export const TEMPORAL_RELATION_OPTIONS: SelectOption<string>[] = [
  { value: 'before', label: 'happened before' },
  { value: 'after', label: 'happened after' },
  { value: 'same_time', label: 'same time as' },
  { value: 'around', label: 'around the same time as' },
];
