import type { BroadcastApiResponse } from '@/features/broadcasts';
import type { PageParams } from '@/types/api';

// pending: waiting for this approver, oldest first. decided: ones this approver approved or rejected.
export type ApprovalFilter = 'pending' | 'decided';

export type ApprovalDecision = 'approved' | 'rejected';

export interface ApprovalDecisionResponse {
  decision: ApprovalDecision;
  reason: string | null;
  decidedBy: string;
  decidedAt: string;
}

export interface ApprovalBroadcastResponse extends BroadcastApiResponse {
  submittedCount: number;
  createdById: string;
  sentBy: string | null;
  cancelledAt: string | null;
  latestDecision: ApprovalDecisionResponse | null;
}

export interface ListApprovalsParams extends PageParams {
  status: ApprovalFilter;
  search?: string;
}

export interface ApprovalDetailResponse {
  broadcast: ApprovalBroadcastResponse;
  decisions: ApprovalDecisionResponse[];
  walletAvailable: number;
  canDecide: boolean;
}

export interface ApproveBroadcastRequest {
  reason?: string;
}

export interface RejectBroadcastRequest {
  reason: string;
}
