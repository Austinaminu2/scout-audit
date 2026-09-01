import { Report } from '../db/models/Report';
import { Project } from '../db/models/Project';
import { NotFoundError, UnauthorizedError } from '../utils/errors';

export const reportController = {
  async getUserReports(userId?: string) {
    if (!userId) throw new UnauthorizedError();

    return Report.findAll({
      include: [{ model: Project, where: { user_id: userId } }],
      order: [['created_at', 'DESC']],
    });
  },

  async getReport(reportId: string, userId?: string) {
    if (!userId) throw new UnauthorizedError();

    const report = await Report.findByPk(reportId, {
      include: [{ model: Project }],
    });

    // Same response whether the report doesn't exist or belongs to someone
    // else, so report IDs can't be used to probe for other users' data.
    if (!report || report.Project?.user_id !== userId) {
      throw new NotFoundError('Report not found');
    }

    return report;
  },

  async deleteReport(reportId: string, userId?: string) {
    if (!userId) throw new UnauthorizedError();

    const report = await Report.findByPk(reportId, {
      include: [{ model: Project }],
    });

    if (!report || report.Project?.user_id !== userId) {
      throw new NotFoundError('Report not found');
    }

    await report.destroy();
  },
};
