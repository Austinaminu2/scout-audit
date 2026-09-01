import { Router, Response } from 'express';
import { z } from 'zod';
import { reportController } from '../controllers/reportController';
import { validateAuth } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthRequest } from '../types';

const router = Router();

const idParamSchema = z.object({
  params: z.object({ id: z.string().uuid('id must be a valid UUID') }),
});

// GET /api/reports - List the caller's reports
router.get(
  '/',
  validateAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const reports = await reportController.getUserReports(req.user?.id);
    res.json(reports);
  })
);

// GET /api/reports/:id - Get a specific report (must be owned by the caller)
router.get(
  '/:id',
  validateAuth,
  validate(idParamSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const report = await reportController.getReport(req.params.id, req.user?.id);
    res.json(report);
  })
);

// DELETE /api/reports/:id - Delete a report (must be owned by the caller)
router.delete(
  '/:id',
  validateAuth,
  validate(idParamSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await reportController.deleteReport(req.params.id, req.user?.id);
    res.json({ success: true });
  })
);

export default router;
