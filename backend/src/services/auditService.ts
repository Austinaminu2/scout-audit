import { spawn } from 'child_process';
import logger from '../utils/logger';
import { config } from '../config';

const CLI_TIMEOUT_MS = 30_000;

export const auditService = {
  runCli(contractPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let settled = false;

      // Args passed as an array (not a shell string), so contractPath can't
      // be used for shell injection even though it's derived from user input.
      const child = spawn(config.auditCliPath, ['scan', contractPath, '--format', 'json']);

      let stdout = '';
      let stderr = '';

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        child.kill();
        reject(new Error('Audit CLI timed out'));
      }, CLI_TIMEOUT_MS);

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);

        if (code !== 0) {
          logger.error(`Audit CLI exited with code ${code}: ${stderr}`);
          reject(new Error(`Audit CLI failed: ${stderr || `exit code ${code}`}`));
        } else {
          resolve(stdout);
        }
      });

      child.on('error', (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        logger.error('Audit CLI spawn error:', error);
        reject(error);
      });
    });
  },
};
