import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

export interface StoredScanResult {
  fileName: string;
  originalName: string;
  filePath: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  fileHash: string;
}

export interface UploadedFilePayload {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB = 10,485,760 bytes
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];

const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

@Injectable()
export class AccessControlStorageService {
  private readonly logger = new Logger(AccessControlStorageService.name);

  /**
   * Resolves the authoritative disk directory for physical access control scans.
   */
  getUploadDir(): string {
    const cwd = process.cwd();
    const dir = cwd.endsWith('apps/api')
      ? path.resolve(cwd, 'uploads/access-control/scans')
      : path.resolve(cwd, 'apps/api/uploads/access-control/scans');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * Validates and persists an uploaded approval or revocation scan document to disk.
   */
  async saveScanFile(
    file: UploadedFilePayload,
    documentType: 'GRANT' | 'REVOCATION' = 'GRANT',
  ): Promise<StoredScanResult> {
    if (!file || !file.buffer) {
      throw new BadRequestException(
        'A document file is required (PDF, PNG, JPG, or JPEG up to 10MB).',
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File exceeds the maximum permitted size of 10MB.');
    }

    const normalizedMime = (file.mimetype || '').toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.includes(normalizedMime)) {
      throw new BadRequestException(
        'Invalid file type. Only PDF, PNG, JPG, and JPEG documents are permitted.',
      );
    }

    let ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      if (normalizedMime.includes('pdf')) {
        ext = '.pdf';
      } else if (normalizedMime.includes('png')) {
        ext = '.png';
      } else {
        ext = '.jpg';
      }
    }

    // Generate SHA-256 hash
    const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // Generate safe, unique, collision-resistant filename
    const safeType = documentType.toLowerCase();
    const timestamp = Date.now();
    const randomHex = crypto.randomBytes(6).toString('hex');
    const safeName = `scan-${safeType}-${timestamp}-${randomHex}${ext}`;

    const uploadDir = this.getUploadDir();
    const filePath = path.join(uploadDir, safeName);

    try {
      await fs.promises.writeFile(filePath, file.buffer);
    } catch (writeErr: unknown) {
      this.logger.error(
        `Failed to write access control scan file "${safeName}" to disk`,
        writeErr instanceof Error ? writeErr.stack : String(writeErr),
      );
      throw new InternalServerErrorException(
        'Failed to save uploaded document file due to storage error.',
      );
    }

    const fileUrl = `/api/v1/access-control/documents/file/${safeName}`;

    this.logger.log(
      `Saved ${documentType} scan: ${safeName} (${file.size} bytes, SHA-256: ${fileHash.substring(0, 16)}...)`,
    );

    return {
      fileName: safeName,
      originalName: path.basename(file.originalname || safeName).replace(/\0/g, ''),
      filePath,
      fileUrl,
      mimeType: normalizedMime,
      fileSize: file.size,
      fileHash,
    };
  }

  /**
   * Safely streams an access control document scan to the client response, preventing path traversal.
   */
  async streamScanFile(filename: string, res: Response, isAttachment = false): Promise<void> {
    const sanitized = path.basename(filename).replace(/\0/g, '');
    const uploadDir = this.getUploadDir();
    const filePath = path.resolve(uploadDir, sanitized);
    const ext = path.extname(sanitized).toLowerCase();

    if (
      !ALLOWED_EXTENSIONS.includes(ext) ||
      !filePath.startsWith(uploadDir + path.sep) ||
      !fs.existsSync(filePath) ||
      !fs.statSync(filePath).isFile()
    ) {
      throw new NotFoundException(`Access control scan file "${sanitized}" not found`);
    }

    const contentType = MIME_MAP[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    const dispositionType = isAttachment ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${dispositionType}; filename="${sanitized}"`);
    res.setHeader('Cache-Control', 'private, max-age=86400');

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err: unknown) => {
      this.logger.error(
        `Failed to stream access control scan file "${sanitized}"`,
        err instanceof Error ? err.stack : String(err),
      );
      if (!res.headersSent) {
        res.status(500).json({ statusCode: 500, message: 'Failed to stream scan document' });
      } else {
        res.end();
      }
    });

    stream.pipe(res);
  }

  /**
   * Deletes a scan file from disk (e.g. during rollback or document deletion).
   */
  async deleteScanFile(fileName: string): Promise<boolean> {
    const sanitized = path.basename(fileName).replace(/\0/g, '');
    const uploadDir = this.getUploadDir();
    const filePath = path.resolve(uploadDir, sanitized);

    if (filePath.startsWith(uploadDir + path.sep) && fs.existsSync(filePath)) {
      try {
        await fs.promises.unlink(filePath);
        this.logger.log(`Unlinked scan file from disk: ${sanitized}`);
        return true;
      } catch (err: unknown) {
        this.logger.warn(
          `Failed to unlink scan file "${filePath}"`,
          err instanceof Error ? err.stack : String(err),
        );
        return false;
      }
    }
    return false;
  }
}
