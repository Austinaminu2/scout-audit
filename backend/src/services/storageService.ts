import fs from 'fs-extra';
import path from 'path';
import { randomUUID } from 'crypto';
import logger from '../utils/logger';

const TEMP_DIR = path.resolve(process.cwd(), 'temp');

// file.originalname is attacker-controlled (it's whatever the client sends
// in the multipart request). Strip it down to a plain basename with a safe
// character set before it ever touches the filesystem, so a name like
// "../../etc/passwd" can't escape TEMP_DIR.
function sanitizeFilename(originalName: string): string {
  const base = path.basename(originalName);
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned || 'contract';
}

export const storageService = {
  async saveTempFile(file: Express.Multer.File): Promise<string> {
    await fs.ensureDir(TEMP_DIR);

    const filename = `${randomUUID()}-${sanitizeFilename(file.originalname)}`;
    const filepath = path.resolve(TEMP_DIR, filename);

    // Defense in depth: confirm the resolved path never escapes TEMP_DIR.
    if (!filepath.startsWith(TEMP_DIR + path.sep)) {
      throw new Error('Resolved temp file path escaped the temp directory');
    }

    await fs.writeFile(filepath, file.buffer);
    return filepath;
  },

  async deleteTempFile(filepath: string): Promise<void> {
    try {
      await fs.remove(filepath);
    } catch (error) {
      logger.warn(`Failed to delete temp file: ${filepath}`, error);
    }
  },
};
