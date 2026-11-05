import type { PageParams } from '../../common/http/pagination';
import type { BroadcastDetailResponse } from '../broadcasts';

export const APPROVAL_DECISIONS = ['approved', 'rejected'] as const;
export type ApprovalDecisionValue = (typeof APPROVAL_DECISIONS)[number];

// pending: waiting for a decision you may make; decided: decisions you made.
export const APPROVAL_QUEUES = ['pending', 'decided'] as const;
export type ApprovalQueue = (typeof APPROVAL_QUEUES)[number];

export interface ListApprovalsRequest extends PageParams {
  status?: ApprovalQueue;
  search?: string;
}

export interface ApproveBroadcastRequest {
  reason?: string;
}

export interface RejectBroadcastRequest {
  reason: string;
}

export interface ApprovalParams {
  broadcastId: string;
}

export interface DecisionRecordResponse {
  decision: ApprovalDecisionValue;
  reason: string | null;
  decidedBy: string;
  decidedAt: Date;
}

export interface ApprovalDetailResponse {
  broadcast: BroadcastDetailResponse;
  decisions: DecisionRecordResponse[];
  // Credits free in the wallet that would pay if approved now (the author's, or the organisation's).
  walletAvailable: number;
  canDecide: boolean;
}
