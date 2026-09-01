import { Router, Response } from 'express';
import { z } from 'zod';
import { projectController } from '../controllers/projectController';
import { validateAuth } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthRequest } from '../types';

const router = Router();

const idParamSchema = z.object({
  params: z.object({ id: z.string().uuid('id must be a valid UUID') }),
});

const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'name is required').max(255),
  }),
});

// GET /api/projects - List the caller's projects
router.get(
  '/',
  validateAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    res.json(await projectController.listProjects(req.user?.id));
  })
);

// POST /api/projects - Create a project
router.post(
  '/',
  validateAuth,
  validate(createProjectSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name } = req.body as { name: string };
    res.status(201).json(await projectController.createProject(req.user?.id, name));
  })
);

// GET /api/projects/:id - Get a specific project (must be owned by the caller)
router.get(
  '/:id',
  validateAuth,
  validate(idParamSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    res.json(await projectController.getProject(req.params.id, req.user?.id));
  })
);

// DELETE /api/projects/:id - Delete a project (must be owned by the caller)
router.delete(
  '/:id',
  validateAuth,
  validate(idParamSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await projectController.deleteProject(req.params.id, req.user?.id);
    res.json({ success: true });
  })
);

export default router;
