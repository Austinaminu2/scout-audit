import { Project } from '../db/models/Project';
import { NotFoundError, UnauthorizedError } from '../utils/errors';

export const projectController = {
  async listProjects(userId?: string) {
    if (!userId) throw new UnauthorizedError();
    return Project.findAll({ where: { user_id: userId }, order: [['created_at', 'DESC']] });
  },

  async createProject(userId: string | undefined, name: string) {
    if (!userId) throw new UnauthorizedError();
    return Project.create({ name, user_id: userId });
  },

  async getProject(projectId: string, userId?: string) {
    if (!userId) throw new UnauthorizedError();
    const project = await Project.findOne({ where: { id: projectId, user_id: userId } });
    if (!project) throw new NotFoundError('Project not found');
    return project;
  },

  async deleteProject(projectId: string, userId?: string) {
    if (!userId) throw new UnauthorizedError();
    const project = await Project.findOne({ where: { id: projectId, user_id: userId } });
    if (!project) throw new NotFoundError('Project not found');
    await project.destroy();
  },
};
