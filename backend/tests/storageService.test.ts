import path from 'path';
import fs from 'fs-extra';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

import { storageService } from '../src/services/storageService';

function makeFile(originalname: string): Express.Multer.File {
  return {
    fieldname: 'contract',
    originalname,
    encoding: '7bit',
    mimetype: 'application/octet-stream',
    buffer: Buffer.from('fn main() {}'),
    size: 12,
  } as Express.Multer.File;
}

describe('storageService.saveTempFile', () => {
  afterEach(async () => {
    await fs.remove(path.join(process.cwd(), 'temp'));
  });

  it('strips path traversal segments from the original filename', async () => {
    const tempDir = path.resolve(process.cwd(), 'temp');
    const filepath = await storageService.saveTempFile(makeFile('../../etc/passwd'));

    expect(filepath.startsWith(tempDir + path.sep)).toBe(true);
    expect(await fs.pathExists(filepath)).toBe(true);
  });

  it('keeps a normal filename intact aside from the uuid prefix', async () => {
    const filepath = await storageService.saveTempFile(makeFile('token.rs'));
    expect(path.basename(filepath).endsWith('-token.rs')).toBe(true);
  });
});
