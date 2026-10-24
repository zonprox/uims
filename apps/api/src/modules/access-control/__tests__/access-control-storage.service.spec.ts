import { NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessControlStorageService } from '../access-control-storage.service';

describe('AccessControlStorageService', () => {
  let service: AccessControlStorageService;
  const testUploadDir = path.resolve(process.cwd(), 'apps/api/uploads/access-control/test-scans');

  beforeEach(() => {
    service = new AccessControlStorageService();
    vi.spyOn(service, 'getUploadDir').mockReturnValue(testUploadDir);
    if (!fs.existsSync(testUploadDir)) {
      fs.mkdirSync(testUploadDir, { recursive: true });
    }
  });

  afterEach(async () => {
    if (fs.existsSync(testUploadDir)) {
      await fs.promises.rm(testUploadDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  it('should reject files exceeding 10MB limit with BadRequestException', async () => {
    const hugeFile = {
      originalname: 'large.pdf',
      mimetype: 'application/pdf',
      size: 10 * 1024 * 1024 + 1, // 10MB + 1 byte
      buffer: Buffer.alloc(10),
    };

    await expect(service.saveScanFile(hugeFile)).rejects.toThrow(
      'File exceeds the maximum permitted size of 10MB.',
    );
  });

  it('should reject disallowed MIME types (e.g. application/x-msdownload or executable)', async () => {
    const maliciousFile = {
      originalname: 'virus.exe',
      mimetype: 'application/x-msdownload',
      size: 1024,
      buffer: Buffer.from('malicious binary'),
    };

    await expect(service.saveScanFile(maliciousFile)).rejects.toThrow(
      'Invalid file type. Only PDF, PNG, JPG, and JPEG documents are permitted.',
    );
  });

  it('should save valid PDF file with genuine SHA-256 hash and sanitized filename', async () => {
    const content = Buffer.from('Official Physical Door Access Approval Document');
    const validFile = {
      originalname: '../../../etc/passwd.pdf',
      mimetype: 'application/pdf',
      size: content.length,
      buffer: content,
    };

    const result = await service.saveScanFile(validFile, 'GRANT');

    expect(result.fileName).toMatch(/^scan-grant-\d+-[a-f0-9]+\.pdf$/);
    expect(result.originalName).toBe('passwd.pdf'); // Sanitized!
    expect(result.fileHash).toMatch(/^[a-f0-9]{64}$/);
    expect(fs.existsSync(result.filePath)).toBe(true);

    // Verify written content matches buffer
    const written = await fs.promises.readFile(result.filePath);
    expect(written.toString()).toBe('Official Physical Door Access Approval Document');

    // Clean up
    await service.deleteScanFile(result.fileName);
    expect(fs.existsSync(result.filePath)).toBe(false);
  });

  it('should reject path traversal attempts when streaming files', async () => {
    const mockRes = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;

    await expect(service.streamScanFile('../../etc/passwd', mockRes)).rejects.toThrow(
      NotFoundException,
    );
  });
});
