import { auditService } from '../services/auditService';
import { storageService } from '../services/storageService';
import { parsingService } from '../services/parsingService';
import { Report } from '../db/models/Report';
import { Project } from '../db/models/Project';

export const uploadController = {
  async analyzeContract(file: Express.Multer.File, userId?: string) {
    const tempPath = await storageService.saveTempFile(file);

    try {
      const cliOutput = await auditService.runCli(tempPath);
      const auditReport = parsingService.parse(cliOutput);

      // The CLI reports findings against tempPath (the uuid-prefixed name
      // on disk) since that's the only path it ever sees. Swap it back for
      // the name the user actually uploaded before this leaves the server.
      auditReport.findings = auditReport.findings.map((finding) =>
        finding.file === tempPath ? { ...finding, file: file.originalname } : finding
      );

      if (!userId) {
        return { success: true, report: auditReport };
      }

      let project = await Project.findOne({ where: { user_id: userId } });
      if (!project) {
        project = await Project.create({ name: 'Default', user_id: userId });
      }

      const savedReport = await Report.create({
        project_id: project.id,
        contract_name: file.originalname,
        findings: auditReport.findings,
        gas_profile: auditReport.gas_profile,
        score: auditReport.score,
        ready_for_audit: auditReport.ready_for_audit,
      });

      return { success: true, report: savedReport };
    } finally {
      // Always clean up, even if the CLI run or DB write failed.
      await storageService.deleteTempFile(tempPath);
    }
  },
};
