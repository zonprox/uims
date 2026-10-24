import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  AccessAssignmentStatus,
  AccessSubjectType,
  AccessValidityType,
  DoorDocumentType,
  DoorSecurityLevel,
  DoorStatus,
  NonADUserStatus,
  type PrismaClient,
} from '@prisma/client';
import { type SeederContext, runDomainSeeder } from './seeder.utils';

function createMockPdfBuffer(
  title: string,
  referenceNumber: string,
  approver: string,
  dateStr: string,
  reason: string,
): Buffer {
  const content = `%PDF-1.4
1 0 obj
<<
  /Type /Catalog
  /Pages 2 0 R
>>
endobj
2 0 obj
<<
  /Type /Pages
  /Kids [3 0 R]
  /Count 1
>>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 612 792]
  /Contents 4 0 R
  /Resources <<
    /Font <<
      /F1 <<
        /Type /Font
        /Subtype /Type1
        /BaseFont /Helvetica
      >>
    >>
  >>
>>
endobj
4 0 obj
<<
  /Length 400
>>
stream
BT
/F1 16 Tf
50 720 Td
(${title}) Tj
/F1 12 Tf
0 -30 Td
(Document Reference: ${referenceNumber}) Tj
0 -20 Td
(Approving Authority: ${approver}) Tj
0 -20 Td
(Issuance Date: ${dateStr}) Tj
0 -20 Td
(Classification: CONFIDENTIAL - PHYSICAL ACCESS AUTHORIZATION) Tj
0 -25 Td
(Business Justification: ${reason.replace(/[()]/g, '')}) Tj
0 -30 Td
(Approved in accordance with Enterprise Information Security Directive ISO 27001.) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
00000000bb 00000 n 
00000001fd 00000 n 
trailer
<<
  /Size 5
  /Root 1 0 R
>>
startxref
650
%%EOF`;
  return Buffer.from(content, 'utf-8');
}

export async function seedAccessControl(prisma: PrismaClient, ctx?: SeederContext) {
  return runDomainSeeder(
    'AccessControlSeeder',
    '🚪',
    'Physical Access Control (Doors, Non-AD Users, Document Scans & Clearance Assignments)',
    async (logger) => {
      // ----------------------------------------------------
      // 1. RBAC Permissions Seeding for AccessControl
      // ----------------------------------------------------
      const accessControlActions = [
        'create',
        'read',
        'update',
        'delete',
        'export',
        'manage',
        'write',
      ];
      const permIds: Record<string, string> = {};

      for (const action of accessControlActions) {
        const perm = await prisma.permission.upsert({
          where: { action_subject: { action, subject: 'AccessControl' } },
          update: {},
          create: { action, subject: 'AccessControl' },
        });
        permIds[action] = perm.id;
      }

      // Also register Title-Case actions for explicit verification compatibility
      const titleCaseActions = ['Read', 'Write', 'Delete'];
      for (const action of titleCaseActions) {
        const perm = await prisma.permission.upsert({
          where: { action_subject: { action, subject: 'AccessControl' } },
          update: {},
          create: { action, subject: 'AccessControl' },
        });
        permIds[action] = perm.id;
      }

      // Assign to Admin role
      const adminRole = await prisma.role.findFirst({
        where: { name: { in: ['Admin', 'Super Admin'] } },
      });
      if (adminRole) {
        for (const pid of Object.values(permIds)) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: { roleId: adminRole.id, permissionId: pid },
            },
            update: {},
            create: { roleId: adminRole.id, permissionId: pid },
          });
        }
      }

      logger.log('🔒 Seeded AccessControl RBAC permissions.');

      // ----------------------------------------------------
      // 2. Mock Approval Scan Files on Disk with Genuine SHA-256
      // ----------------------------------------------------
      const uploadDir = path.resolve(__dirname, '../../uploads/access-control/scans');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const scanDefinitions = [
        {
          fileName: 'scan-grant-dar-2026-10-001.pdf',
          originalName: 'Signed_DAR_2026_10_001_DataCenter.pdf',
          documentType: DoorDocumentType.GRANT,
          approverName: 'Doan Minh Tri',
          approverTitle: 'VP of Information Security',
          referenceNumber: 'DAR-2026-10-001',
          reason:
            'Authorized permanent and operational clearance for Core Data Center and Server Vault.',
          notes: 'Formally endorsed by Broadpeak Security & Governance Committee.',
          dateStr: '2026-10-01',
        },
        {
          fileName: 'scan-grant-dar-2026-10-002.pdf',
          originalName: 'Signed_DAR_2026_10_002_FactoryServerRoom.pdf',
          documentType: DoorDocumentType.GRANT,
          approverName: 'Pham Hoang Nam',
          approverTitle: 'Factory IT Manager',
          referenceNumber: 'DAR-2026-10-002',
          reason: 'Plant IT server room and turnstile access for factory administration.',
          notes: 'BSL Soc Trang Plant security clearance.',
          dateStr: '2026-10-05',
        },
        {
          fileName: 'scan-grant-dar-2026-09-088.pdf',
          originalName: 'Signed_DAR_2026_09_088_ContractorMaintenance.pdf',
          documentType: DoorDocumentType.GRANT,
          approverName: 'Dang Thanh Phong',
          approverTitle: 'Enterprise IT Director',
          referenceNumber: 'DAR-2026-09-088',
          reason: 'Scheduled IT maintenance and annual third-party compliance audit.',
          notes: 'Time-bound contractor & auditor access clearance.',
          dateStr: '2026-09-15',
        },
        {
          fileName: 'scan-revoke-drr-2026-10-012.pdf',
          originalName: 'Signed_DRR_2026_10_012_AuditRevocation.pdf',
          documentType: DoorDocumentType.REVOCATION,
          approverName: 'Dang Thanh Phong',
          approverTitle: 'Enterprise IT Director',
          referenceNumber: 'DRR-2026-10-012',
          reason:
            'Scheduled external audit completed; physical access credentials revoked in full compliance with ISO 27001.',
          notes: 'Completed audit clearance and badge de-provisioning.',
          dateStr: '2026-10-14',
        },
      ];

      // Resolve admin AppUser for uploadedById
      const adminAppUser = await prisma.appUser.findFirst({
        where: { username: { in: ['admin', 'phong.dang'] } },
      });

      const seededScans: Record<string, string> = {};

      for (const scanDef of scanDefinitions) {
        const filePath = path.join(uploadDir, scanDef.fileName);
        const relativeFilePath = `uploads/access-control/scans/${scanDef.fileName}`;
        const fileBuffer = createMockPdfBuffer(
          scanDef.documentType === DoorDocumentType.GRANT
            ? 'PHYSICAL DOOR ACCESS GRANT AUTHORIZATION'
            : 'PHYSICAL DOOR ACCESS REVOCATION CLEARANCE',
          scanDef.referenceNumber,
          scanDef.approverName,
          scanDef.dateStr,
          scanDef.reason,
        );

        fs.writeFileSync(filePath, fileBuffer);
        const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        const fileSize = fileBuffer.length;

        // Find existing record by fileName or create
        const existingScan = await prisma.doorAccessDocumentScan.findFirst({
          where: { fileName: scanDef.fileName },
        });

        const scanRecord = existingScan
          ? await prisma.doorAccessDocumentScan.update({
              where: { id: existingScan.id },
              data: {
                fileHash,
                fileSize,
                filePath: relativeFilePath,
                fileUrl: `/api/v1/access-control/documents/file/${scanDef.fileName}`,
                approverName: scanDef.approverName,
                approverTitle: scanDef.approverTitle,
                referenceNumber: scanDef.referenceNumber,
                reason: scanDef.reason,
                notes: scanDef.notes,
              },
            })
          : await prisma.doorAccessDocumentScan.create({
              data: {
                documentType: scanDef.documentType,
                fileName: scanDef.fileName,
                originalName: scanDef.originalName,
                filePath: relativeFilePath,
                fileUrl: `/api/v1/access-control/documents/file/${scanDef.fileName}`,
                mimeType: 'application/pdf',
                fileSize,
                fileHash,
                approverName: scanDef.approverName,
                approverTitle: scanDef.approverTitle,
                referenceNumber: scanDef.referenceNumber,
                reason: scanDef.reason,
                notes: scanDef.notes,
                uploadedById: adminAppUser?.id || null,
              },
            });

        seededScans[scanDef.fileName] = scanRecord.id;
      }

      logger.log(
        `📄 Seeded ${Object.keys(seededScans).length} approval scan documents with genuine SHA-256 hashes.`,
      );

      // ----------------------------------------------------
      // 3. Seed Physical Doors (8 Facilities)
      // ----------------------------------------------------
      const orgHolding = await prisma.organization.findUnique({
        where: { code: 'HOLDING' },
      });
      const orgBSL = await prisma.organization.findUnique({
        where: { code: 'BSL' },
      });
      const orgBSH = await prisma.organization.findUnique({
        where: { code: 'BSH' },
      });

      const doorsData = [
        {
          doorCode: 'DR-DC-01',
          name: 'Main Data Center Entrance',
          building: 'Broadpeak Tower',
          floor: '3F',
          zone: 'Core IT Zone',
          location: 'Broadpeak Tower - 3F - Room 301',
          organizationId: orgHolding?.id || null,
          securityLevel: DoorSecurityLevel.CRITICAL,
          status: DoorStatus.ACTIVE,
          controllerModel: 'HID Aero X1100',
          controllerIp: '192.168.10.201',
          readerType: 'Mifare DESFire EV3 + Biometric',
          readerId: 'RDR-DC-01-A',
          notes:
            'Primary biometric & encrypted smartcard ingress for central enterprise data center.',
        },
        {
          doorCode: 'DR-DC-02',
          name: 'Server Cage Area A',
          building: 'Broadpeak Tower',
          floor: '3F',
          zone: 'Server Vault',
          location: 'Broadpeak Tower - 3F - Cage A',
          organizationId: orgHolding?.id || null,
          securityLevel: DoorSecurityLevel.CRITICAL,
          status: DoorStatus.ACTIVE,
          controllerModel: 'HID Aero X1100',
          controllerIp: '192.168.10.202',
          readerType: 'HID Signo 40 Smart Card',
          readerId: 'RDR-DC-02-A',
          notes: 'Dedicated enclosure housing core ERP, active directory, and storage clusters.',
        },
        {
          doorCode: 'DR-NOC-01',
          name: 'Network Operations Center',
          building: 'Broadpeak Tower',
          floor: '2F',
          zone: 'Monitoring Center',
          location: 'Broadpeak Tower - 2F - Room 204',
          organizationId: orgHolding?.id || null,
          securityLevel: DoorSecurityLevel.HIGH,
          status: DoorStatus.ACTIVE,
          controllerModel: 'Honeywell PRO4200',
          controllerIp: '192.168.10.210',
          readerType: 'RFID Proximity Reader',
          readerId: 'RDR-NOC-01',
          notes: '24/7 infrastructure monitoring and enterprise network operations dispatch.',
        },
        {
          doorCode: 'DR-BSL-SRV',
          name: 'BSL Factory Server Room',
          building: 'BSL Soc Trang Plant',
          floor: '1F',
          zone: 'Plant IT Core',
          location: 'Soc Trang Plant - Factory Admin Building - 1F',
          organizationId: orgBSL?.id || null,
          securityLevel: DoorSecurityLevel.CRITICAL,
          status: DoorStatus.ACTIVE,
          controllerModel: 'ZKTeco InBio-460 Pro',
          controllerIp: '10.20.10.15',
          readerType: 'Fingerprint + Card',
          readerId: 'RDR-BSL-SRV-01',
          notes:
            'Industrial plant on-premise servers, SCADA gateway, and plant network distribution.',
        },
        {
          doorCode: 'DR-BSL-LOG',
          name: 'Central Warehouse High-Value Cage',
          building: 'BSL Soc Trang Plant',
          floor: '1F',
          zone: 'Central Warehouse',
          location: 'Soc Trang Plant - Logistics Hub - Section W1',
          organizationId: orgBSL?.id || null,
          securityLevel: DoorSecurityLevel.RESTRICTED,
          status: DoorStatus.ACTIVE,
          controllerModel: 'Hikvision DS-K2604',
          controllerIp: '10.20.20.40',
          readerType: 'Mifare Card Reader',
          readerId: 'RDR-BSL-LOG-01',
          notes: 'High-value accessories, premium technical textiles, and bonded storage.',
        },
        {
          doorCode: 'DR-BSL-SMP',
          name: 'Technical CAD/CAM Sample Room',
          building: 'BSL Soc Trang Plant',
          floor: '2F',
          zone: 'Technical QA',
          location: 'Soc Trang Plant - R&D Wing - 2F',
          organizationId: orgBSL?.id || null,
          securityLevel: DoorSecurityLevel.RESTRICTED,
          status: DoorStatus.ACTIVE,
          controllerModel: 'Honeywell PRO4200',
          controllerIp: '10.20.10.25',
          readerType: 'RFID Card Reader',
          readerId: 'RDR-BSL-SMP-01',
          notes: 'Garment patterning, 3D prototyping, and confidential customer sample production.',
        },
        {
          doorCode: 'DR-BSH-01',
          name: 'Regional Executive Leadership Suite',
          building: 'BSH Ho Chi Minh',
          floor: '5F',
          zone: 'Executive Area',
          location: 'BSH Corporate Office - 5F',
          organizationId: orgBSH?.id || null,
          securityLevel: DoorSecurityLevel.RESTRICTED,
          status: DoorStatus.ACTIVE,
          controllerModel: 'HID Signo 20',
          controllerIp: '172.16.5.10',
          readerType: 'Keypad + Card',
          readerId: 'RDR-BSH-EXEC-01',
          notes: 'Boardroom, legal records vault, and executive executive suites.',
        },
        {
          doorCode: 'DR-GATE-01',
          name: 'Main Plant Pedestrian Turnstile',
          building: 'BSL Soc Trang Plant',
          floor: 'Ground',
          zone: 'Perimeter Gate',
          location: 'Soc Trang Plant - Main Entrance Gate A',
          organizationId: orgBSL?.id || null,
          securityLevel: DoorSecurityLevel.STANDARD,
          status: DoorStatus.ACTIVE,
          controllerModel: 'ZKTeco SpeedFace-V5L',
          controllerIp: '10.20.1.10',
          readerType: 'Facial Recognition + QR',
          readerId: 'RDR-GATE-01-A',
          notes: 'Factory perimeter staff pedestrian transit and time attendance access control.',
        },
      ];

      const seededDoors: Record<string, string> = {};

      for (const door of doorsData) {
        const record = await prisma.accessDoor.upsert({
          where: { doorCode: door.doorCode },
          update: door,
          create: door,
        });
        seededDoors[door.doorCode] = record.id;
      }

      logger.log(`🚪 Seeded ${Object.keys(seededDoors).length} physical doors.`);

      // ----------------------------------------------------
      // 4. Seed Non-AD External Personnel (5 Contractors & Visitors)
      // ----------------------------------------------------
      const now = new Date();
      const nonADUsersData = [
        {
          badgeNumber: 'EXT-B0892',
          fullName: 'Michael Chen',
          company: 'Cisco Systems Vietnam',
          identityNumber: '079090001882',
          userType: 'CONTRACTOR',
          status: NonADUserStatus.ACTIVE,
          phone: '+84 903 112 334',
          email: 'michael.chen@cisco-contractor.com',
          validFrom: new Date(now.getTime() - 10 * 86400 * 1000),
          validTo: new Date(now.getTime() + 30 * 86400 * 1000),
          notes: 'Lead Systems Engineer for core network switch & spine-leaf upgrade.',
        },
        {
          badgeNumber: 'EXT-B0910',
          fullName: 'Nguyen Thi Huong',
          company: 'Schneider Electric Facilities',
          identityNumber: '079185002931',
          userType: 'CONTRACTOR',
          status: NonADUserStatus.ACTIVE,
          phone: '+84 918 223 445',
          email: 'huong.nguyen@schneider-electric.vn',
          validFrom: new Date(now.getTime() - 5 * 86400 * 1000),
          validTo: new Date(now.getTime() + 14 * 86400 * 1000),
          notes:
            'UPS and cooling infrastructure specialist conducting quarterly preventative maintenance.',
        },
        {
          badgeNumber: 'VIS-1044',
          fullName: 'David Miller',
          company: 'KPMG Vietnam',
          identityNumber: 'P8892019A',
          userType: 'AUDITOR',
          status: NonADUserStatus.ACTIVE,
          phone: '+84 909 887 766',
          email: 'david.miller@kpmg.com.vn',
          validFrom: new Date(now.getTime() - 60 * 86400 * 1000),
          validTo: new Date(now.getTime() - 10 * 86400 * 1000),
          notes: 'External IT governance and ISO 27001 lead auditor (audit cycle completed).',
        },
        {
          badgeNumber: 'EXT-B0721',
          fullName: 'Le Van Dat',
          company: 'CleanWorld Facility Services',
          identityNumber: '080092004551',
          userType: 'CONTRACTOR',
          status: NonADUserStatus.ACTIVE,
          phone: '+84 934 556 677',
          email: 'dat.levan@cleanworld.vn',
          validFrom: new Date(now.getTime() - 40 * 86400 * 1000),
          validTo: new Date(now.getTime() - 7 * 86400 * 1000),
          notes: 'Specialized server room subfloor and technical clean maintenance supervisor.',
        },
        {
          badgeNumber: 'VIS-2033',
          fullName: 'Park Jin-Woo',
          company: 'Youngone Global Compliance',
          identityNumber: 'M10492834',
          userType: 'AUDITOR',
          status: NonADUserStatus.ACTIVE,
          phone: '+82 10 4928 3391',
          email: 'jinwoo.park@youngone-compliance.kr',
          validFrom: new Date(now.getTime() - 15 * 86400 * 1000),
          validTo: new Date(now.getTime() + 75 * 86400 * 1000),
          notes:
            'Global headquarters internal auditor inspecting plant compliance and ESG metrics.',
        },
      ];

      const seededNonAD: Record<string, string> = {};

      for (const u of nonADUsersData) {
        const record = await prisma.nonADUser.upsert({
          where: { badgeNumber: u.badgeNumber },
          update: u,
          create: u,
        });
        seededNonAD[u.badgeNumber] = record.id;
      }

      logger.log(
        `👥 Seeded ${Object.keys(seededNonAD).length} Non-AD external contractors & visitors.`,
      );

      // ----------------------------------------------------
      // 5. Seed Door Access Assignments (12 Assignments with Scan Links)
      // ----------------------------------------------------
      const dirNamPham = await prisma.directoryUser.findFirst({
        where: { employeeCode: 'BSL-002' },
      });
      const dirPhongDang = await prisma.directoryUser.findFirst({
        where: { employeeCode: 'BSH-002' },
      });

      const scanGrant10001 = seededScans['scan-grant-dar-2026-10-001.pdf'];
      const scanGrant10002 = seededScans['scan-grant-dar-2026-10-002.pdf'];
      const scanGrant09088 = seededScans['scan-grant-dar-2026-09-088.pdf'];
      const scanRevoke10012 = seededScans['scan-revoke-drr-2026-10-012.pdf'];

      const assignmentsData = [
        // 1 & 2: Active Permanent AD User - Pham Hoang Nam (Factory IT Lead)
        {
          doorId: seededDoors['DR-BSL-SRV'],
          subjectType: AccessSubjectType.DIRECTORY_USER,
          directoryUserId: dirNamPham?.id || null,
          accessType: AccessValidityType.PERMANENT,
          status: AccessAssignmentStatus.ACTIVE,
          grantReason: 'BSL Factory IT leadership and server infrastructure administration.',
          grantDocumentId: scanGrant10002,
          grantedById: adminAppUser?.id || null,
          validFrom: new Date(now.getTime() - 180 * 86400 * 1000),
        },
        {
          doorId: seededDoors['DR-GATE-01'],
          subjectType: AccessSubjectType.DIRECTORY_USER,
          directoryUserId: dirNamPham?.id || null,
          accessType: AccessValidityType.PERMANENT,
          status: AccessAssignmentStatus.ACTIVE,
          grantReason: 'Plant manager perimeter gate and turnstile access.',
          grantDocumentId: scanGrant10002,
          grantedById: adminAppUser?.id || null,
          validFrom: new Date(now.getTime() - 180 * 86400 * 1000),
        },
        {
          doorId: seededDoors['DR-BSL-LOG'],
          subjectType: AccessSubjectType.DIRECTORY_USER,
          directoryUserId: dirNamPham?.id || null,
          accessType: AccessValidityType.PERMANENT,
          status: AccessAssignmentStatus.ACTIVE,
          grantReason: 'Factory IT server closet inspection inside Central Warehouse.',
          grantDocumentId: scanGrant10002,
          grantedById: adminAppUser?.id || null,
          validFrom: new Date(now.getTime() - 120 * 86400 * 1000),
        },

        // 4, 5, 6: Active Permanent AD User - Dang Thanh Phong (Enterprise IT Director)
        {
          doorId: seededDoors['DR-DC-01'],
          subjectType: AccessSubjectType.DIRECTORY_USER,
          directoryUserId: dirPhongDang?.id || null,
          accessType: AccessValidityType.PERMANENT,
          status: AccessAssignmentStatus.ACTIVE,
          grantReason: 'Enterprise IT architecture governance and Data Center oversight.',
          grantDocumentId: scanGrant10001,
          grantedById: adminAppUser?.id || null,
          validFrom: new Date(now.getTime() - 200 * 86400 * 1000),
        },
        {
          doorId: seededDoors['DR-DC-02'],
          subjectType: AccessSubjectType.DIRECTORY_USER,
          directoryUserId: dirPhongDang?.id || null,
          accessType: AccessValidityType.PERMANENT,
          status: AccessAssignmentStatus.ACTIVE,
          grantReason: 'Enterprise IT storage and core compute cluster administration.',
          grantDocumentId: scanGrant10001,
          grantedById: adminAppUser?.id || null,
          validFrom: new Date(now.getTime() - 200 * 86400 * 1000),
        },
        {
          doorId: seededDoors['DR-NOC-01'],
          subjectType: AccessSubjectType.DIRECTORY_USER,
          directoryUserId: dirPhongDang?.id || null,
          accessType: AccessValidityType.PERMANENT,
          status: AccessAssignmentStatus.ACTIVE,
          grantReason: 'Network Operations Center executive supervision.',
          grantDocumentId: scanGrant10001,
          grantedById: adminAppUser?.id || null,
          validFrom: new Date(now.getTime() - 200 * 86400 * 1000),
        },

        // 7 & 8: Active Time-Bound Non-AD User - Michael Chen (Cisco Contractor)
        {
          doorId: seededDoors['DR-DC-01'],
          subjectType: AccessSubjectType.NON_AD_USER,
          nonADUserId: seededNonAD['EXT-B0892'],
          accessType: AccessValidityType.TIME_BOUND,
          status: AccessAssignmentStatus.ACTIVE,
          grantReason: 'Cisco spine-leaf network hardware deployment & configuration.',
          grantDocumentId: scanGrant10001,
          grantedById: adminAppUser?.id || null,
          validFrom: new Date(now.getTime() - 10 * 86400 * 1000),
          validTo: new Date(now.getTime() + 30 * 86400 * 1000),
        },
        {
          doorId: seededDoors['DR-DC-02'],
          subjectType: AccessSubjectType.NON_AD_USER,
          nonADUserId: seededNonAD['EXT-B0892'],
          accessType: AccessValidityType.TIME_BOUND,
          status: AccessAssignmentStatus.ACTIVE,
          grantReason: 'Rack mount and fiber cabling inside Server Cage Area A.',
          grantDocumentId: scanGrant10001,
          grantedById: adminAppUser?.id || null,
          validFrom: new Date(now.getTime() - 10 * 86400 * 1000),
          validTo: new Date(now.getTime() + 30 * 86400 * 1000),
        },

        // 9: Active Time-Bound Non-AD User - Nguyen Thi Huong (Schneider Electric)
        {
          doorId: seededDoors['DR-BSL-SRV'],
          subjectType: AccessSubjectType.NON_AD_USER,
          nonADUserId: seededNonAD['EXT-B0910'],
          accessType: AccessValidityType.TIME_BOUND,
          status: AccessAssignmentStatus.ACTIVE,
          grantReason: 'Factory server room modular UPS battery bank maintenance.',
          grantDocumentId: scanGrant10002,
          grantedById: adminAppUser?.id || null,
          validFrom: new Date(now.getTime() - 5 * 86400 * 1000),
          validTo: new Date(now.getTime() + 14 * 86400 * 1000),
        },

        // 10 & 11: Revoked Assignments with Dual Scan Links - David Miller (KPMG Auditor)
        {
          doorId: seededDoors['DR-DC-01'],
          subjectType: AccessSubjectType.NON_AD_USER,
          nonADUserId: seededNonAD['VIS-1044'],
          accessType: AccessValidityType.TIME_BOUND,
          status: AccessAssignmentStatus.REVOKED,
          grantReason: 'Physical inspection of datacenter perimeter and access logs.',
          grantDocumentId: scanGrant09088,
          grantedById: adminAppUser?.id || null,
          validFrom: new Date(now.getTime() - 60 * 86400 * 1000),
          validTo: new Date(now.getTime() - 10 * 86400 * 1000),
          revokedAt: new Date(now.getTime() - 10 * 86400 * 1000),
          revokedById: adminAppUser?.id || null,
          revocationReason: 'Annual ISO 27001 compliance audit concluded successfully.',
          revocationDocumentId: scanRevoke10012,
        },
        {
          doorId: seededDoors['DR-NOC-01'],
          subjectType: AccessSubjectType.NON_AD_USER,
          nonADUserId: seededNonAD['VIS-1044'],
          accessType: AccessValidityType.TIME_BOUND,
          status: AccessAssignmentStatus.REVOKED,
          grantReason: 'Review of NOC incident monitoring workstations and alarm boards.',
          grantDocumentId: scanGrant09088,
          grantedById: adminAppUser?.id || null,
          validFrom: new Date(now.getTime() - 60 * 86400 * 1000),
          validTo: new Date(now.getTime() - 10 * 86400 * 1000),
          revokedAt: new Date(now.getTime() - 10 * 86400 * 1000),
          revokedById: adminAppUser?.id || null,
          revocationReason: 'Annual ISO 27001 compliance audit concluded successfully.',
          revocationDocumentId: scanRevoke10012,
        },

        // 12: Expired Time-Bound Assignment - Le Van Dat (CleanWorld)
        {
          doorId: seededDoors['DR-BSL-SMP'],
          subjectType: AccessSubjectType.NON_AD_USER,
          nonADUserId: seededNonAD['EXT-B0721'],
          accessType: AccessValidityType.TIME_BOUND,
          status: AccessAssignmentStatus.EXPIRED,
          grantReason: 'Deep clean and sanitation of CAD/CAM sample room.',
          grantDocumentId: scanGrant09088,
          grantedById: adminAppUser?.id || null,
          validFrom: new Date(now.getTime() - 40 * 86400 * 1000),
          validTo: new Date(now.getTime() - 7 * 86400 * 1000),
        },
      ];

      // Upsert assignments idempotently
      let assignedCount = 0;
      for (const assignment of assignmentsData) {
        if (!assignment.doorId) continue;
        if (
          assignment.subjectType === AccessSubjectType.DIRECTORY_USER &&
          !assignment.directoryUserId
        )
          continue;
        if (assignment.subjectType === AccessSubjectType.NON_AD_USER && !assignment.nonADUserId)
          continue;

        // Find existing record matching door & subject
        const existing = await prisma.doorAccessAssignment.findFirst({
          where: {
            doorId: assignment.doorId,
            subjectType: assignment.subjectType,
            directoryUserId: assignment.directoryUserId,
            nonADUserId: assignment.nonADUserId,
          },
        });

        if (existing) {
          await prisma.doorAccessAssignment.update({
            where: { id: existing.id },
            data: assignment,
          });
        } else {
          await prisma.doorAccessAssignment.create({
            data: assignment,
          });
        }
        assignedCount++;
      }

      logger.log(`🔑 Seeded ${assignedCount} Door Access Assignments.`);
      return {
        doorsCount: Object.keys(seededDoors).length,
        nonADUsersCount: Object.keys(seededNonAD).length,
        documentScansCount: Object.keys(seededScans).length,
        assignmentsCount: assignedCount,
      };
    },
  );
}
