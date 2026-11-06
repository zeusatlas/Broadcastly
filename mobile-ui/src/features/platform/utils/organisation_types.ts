import type { SelectOption } from '@/components/ui';

// Must match ORGANISATION_TYPES in api/src/modules/organisation/organisation_types.ts.
export type OrganisationType =
  | 'constituency'
  | 'party_branch'
  | 'regional_office'
  | 'church'
  | 'mosque'
  | 'association'
  | 'trade_union'
  | 'cooperative'
  | 'school'
  | 'alumni'
  | 'ngo'
  | 'business'
  | 'community'
  | 'club'
  | 'other';

export const ORGANISATION_TYPE_OPTIONS: SelectOption<OrganisationType>[] = [
  {
    key: 'constituency',
    label: 'Constituency',
    description: 'A party office for one constituency',
  },
  {
    key: 'party_branch',
    label: 'Party branch',
    description: 'A ward, polling-station or local branch',
  },
  {
    key: 'regional_office',
    label: 'Regional office',
    description: 'Covers several constituencies',
  },
  { key: 'church', label: 'Church', description: 'A congregation or parish' },
  { key: 'mosque', label: 'Mosque', description: 'A mosque or Islamic community' },
  { key: 'association', label: 'Association', description: 'Professional or trade association' },
  { key: 'trade_union', label: 'Trade union', description: 'Workers and their union' },
  { key: 'cooperative', label: 'Cooperative', description: 'Farmers, traders or credit union' },
  { key: 'school', label: 'School', description: 'Parents, staff or students' },
  { key: 'alumni', label: 'Alumni group', description: 'Old students of a school' },
  { key: 'ngo', label: 'NGO or charity', description: 'Volunteers, donors and beneficiaries' },
  { key: 'business', label: 'Business', description: 'Staff, agents or customers' },
  { key: 'community', label: 'Community group', description: 'Town, youth or women’s group' },
  { key: 'club', label: 'Club or society', description: 'Sports, social or hobby club' },
  { key: 'other', label: 'Other', description: 'Anything else' },
];

export function organisationTypeLabel(type: string) {
  const known = ORGANISATION_TYPE_OPTIONS.find((option) => option.key === type);
  if (known) return known.label;
  const words = type.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export const DESCRIPTION_MAX_WORDS = 20;

export const wordCount = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
};
