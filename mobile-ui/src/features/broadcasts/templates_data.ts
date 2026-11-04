export interface TemplateItem {
  id: string;
  name: string;
  category: 'Notice' | 'Meeting' | 'Reminder';
  message: string;
  variables: string[];
  updatedAt: string;
}

// Temporary presentation data until the template endpoints are wired.
export const DEMO_TEMPLATES: TemplateItem[] = [
  {
    id: 'template-1',
    name: 'Service update',
    category: 'Notice',
    message: 'Hello {first_name}, here is an important service update for {meeting_date}.',
    variables: ['First name', 'Meeting date'],
    updatedAt: 'Updated today',
  },
  {
    id: 'template-2',
    name: 'Team meeting reminder',
    category: 'Meeting',
    message: 'Reminder: the team meeting is on {meeting_date} at {meeting_location}.',
    variables: ['Meeting date', 'Meeting location'],
    updatedAt: 'Updated yesterday',
  },
  {
    id: 'template-3',
    name: 'Follow-up reminder',
    category: 'Reminder',
    message: 'Please remember to complete your follow-up by {meeting_date}.',
    variables: ['Meeting date'],
    updatedAt: 'Updated Monday',
  },
];
