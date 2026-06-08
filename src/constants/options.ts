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
