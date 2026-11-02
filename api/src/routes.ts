import { Router } from 'express';

import { authRouter } from './modules/auth';
import { healthRouter } from './modules/health';

// Every module's router is mounted here, under /api/v1. One line per module.
// Protection is declared per route inside each module (authenticate → authorize → validate).
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
// apiRouter.use('/organisation', organisationRouter);
// apiRouter.use('/members', membersRouter);
// apiRouter.use('/broadcasts', broadcastsRouter);
// apiRouter.use('/approvals', approvalsRouter);
// apiRouter.use('/credits', creditsRouter);
// apiRouter.use('/reports', reportsRouter);
// apiRouter.use('/notifications', notificationsRouter);
