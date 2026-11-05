import type { TemplateCategory, TemplateField } from '../types';

export const TEMPLATE_CATEGORIES: { key: TemplateCategory; label: string }[] = [
  { key: 'official_notice', label: 'Official notice' },
  { key: 'meeting_announcement', label: 'Meeting announcement' },
  { key: 'reminder', label: 'Reminder' },
];

// Approved personalisation fields (FR-SMS-05); the API rejects any other {…} placeholder.
export const TEMPLATE_FIELDS: { key: TemplateField; label: string; token: string }[] = [
  { key: 'first_name', label: 'First name', token: '{first_name}' },
  { key: 'meeting_date', label: 'Meeting date', token: '{meeting_date}' },
  { key: 'meeting_location', label: 'Meeting location', token: '{meeting_location}' },
];

export const categoryLabel = (category: TemplateCategory) =>
  TEMPLATE_CATEGORIES.find((item) => item.key === category)?.label ?? category;

export const fieldLabel = (field: TemplateField) =>
  TEMPLATE_FIELDS.find((item) => item.key === field)?.label ?? field;

export const formatUpdated = (value: string) =>
  `Updated ${new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;

export const appendToken = (message: string, token: string) =>
  `${message}${message && !message.endsWith(' ') ? ' ' : ''}${token}`;
