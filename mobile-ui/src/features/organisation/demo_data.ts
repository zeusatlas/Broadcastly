import type { ExecutiveStatus } from '@/types/models';

export interface ExecutiveRowData {
  id: string;
  name: string;
  position: string;
  unit: string;
  status: ExecutiveStatus;
  email: string;
  phone: string;
  permissions: string[];
}

// Temporary presentation data until the organisation executive list endpoint is wired.
export const DEMO_EXECUTIVES: ExecutiveRowData[] = [
  {
    id: 'executive-1',
    name: 'Ama Mensah',
    position: 'Operations Director',
    unit: 'Organisation-wide',
    status: 'active',
    email: 'ama.mensah@example.com',
    phone: '024 123 4567',
    permissions: ['Manage appointments', 'Draft broadcasts', 'View reports'],
  },
  {
    id: 'executive-2',
    name: 'Kwame Owusu',
    position: 'Regional Coordinator',
    unit: 'Northern Region',
    status: 'active',
    email: 'kwame.owusu@example.com',
    phone: '024 234 5678',
    permissions: ['Manage members', 'Select recipients'],
  },
  {
    id: 'executive-3',
    name: 'Akosua Asante',
    position: 'Site Lead',
    unit: 'Central Office',
    status: 'suspended',
    email: 'akosua.asante@example.com',
    phone: '024 345 6789',
    permissions: ['Draft broadcasts'],
  },
];
