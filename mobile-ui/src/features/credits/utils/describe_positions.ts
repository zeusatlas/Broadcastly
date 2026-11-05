import type { AllocationRecipientResponse } from '../types';

export const describePositions = ({ positions }: Pick<AllocationRecipientResponse, 'positions'>) =>
  positions.length
    ? positions.map((p) => (p.unitName ? `${p.title} · ${p.unitName}` : p.title)).join(', ')
    : 'No current position';
