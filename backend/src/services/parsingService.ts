import { AuditReport } from '../types/report';

export const parsingService = {
  parse(cliOutput: string): AuditReport {
    try {
      return JSON.parse(cliOutput) as AuditReport;
    } catch {
      throw new Error('Audit CLI returned invalid JSON output');
    }
  },
};
