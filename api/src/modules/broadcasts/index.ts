// Public API of the broadcasts module — SMS drafts, templates, recipient resolution, estimates and dispatch (FR-SMS-01..14).
// Other modules import from here only. Only the table exists so far; drafting and dispatch come next.
export { Broadcast } from './entities/broadcast_entity';
export { broadcastResponseSchema } from './broadcasts_schemas';
export {
  BROADCAST_STATUSES,
  type BroadcastResponse,
  type BroadcastStatus,
} from './broadcasts_types';
