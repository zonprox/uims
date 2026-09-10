import { Logger } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { importNetworkExcel } from '../scripts/import-network-excel';

const logger = new Logger('NetworkSeeder');

export async function seedNetwork(prisma: PrismaClient) {
  logger.log('Starting Network Seeder with Enterprise Excel Workbook Pipeline...');
  try {
    await importNetworkExcel(prisma);
    logger.log('Network Seeder completed successfully.');
  } catch (error: unknown) {
    logger.error(
      'Failed to seed network data via Excel ingestion pipeline:',
      error instanceof Error ? error.stack : error,
    );
    throw error;
  }
}
