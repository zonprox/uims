import type { PrismaClient } from '@prisma/client';

export async function seedOrganizations(prisma: PrismaClient) {
  console.log('🏢 Seeding Enterprise Organizations, Hierarchical Departments & Positions...');

  // 1. Organizations / Entities
  const orgHQ = await prisma.organization.upsert({
    where: { code: 'ACME-US' },
    update: {},
    create: {
      id: 'org-acme-us',
      name: 'Acme Enterprise Global HQ',
      code: 'ACME-US',
      taxId: 'US-TAX-88491023',
      email: 'corp@acme.enterprise',
      phone: '+1 (555) 100-0000',
      address: '350 5th Ave, New York, NY 10118',
      website: 'https://acme.enterprise',
      status: 'ACTIVE',
    },
  });

  const orgEMEA = await prisma.organization.upsert({
    where: { code: 'ACME-EMEA' },
    update: {},
    create: {
      id: 'org-acme-emea',
      name: 'Acme EMEA Regional Operations',
      code: 'ACME-EMEA',
      taxId: 'EU-VAT-49201948',
      email: 'emea@acme.enterprise',
      phone: '+44 20 7946 0912',
      address: '100 Bishopsgate, London EC2N 4AG, UK',
      website: 'https://emea.acme.enterprise',
      status: 'ACTIVE',
    },
  });

  const orgAPAC = await prisma.organization.upsert({
    where: { code: 'ACME-APAC' },
    update: {},
    create: {
      id: 'org-acme-apac',
      name: 'Acme APAC Regional Hub',
      code: 'ACME-APAC',
      taxId: 'SG-UEN-202619482M',
      email: 'apac@acme.enterprise',
      phone: '+65 6789 0123',
      address: '1 Marina Blvd, Singapore 018989',
      website: 'https://apac.acme.enterprise',
      status: 'ACTIVE',
    },
  });

  // 2. Link existing Locations to Organizations
  await prisma.location.updateMany({
    where: { id: { in: ['loc-ny-f4', 'loc-ny-f5', 'loc-sf-bay', 'loc-dc-ny4', 'loc-dc-sv5'] } },
    data: { organizationId: orgHQ.id },
  });

  await prisma.location.updateMany({
    where: { id: 'loc-london' },
    data: { organizationId: orgEMEA.id },
  });

  await prisma.location.updateMany({
    where: { id: 'loc-singapore' },
    data: { organizationId: orgAPAC.id },
  });

  // ─────────────────────────────────────────────────────────
  // 3. Top-level Departments
  // ─────────────────────────────────────────────────────────

  const deptExecutive = await prisma.department.upsert({
    where: { code: 'DEPT-EXEC' },
    update: {},
    create: {
      id: 'dept-exec',
      name: 'Executive & Corporate Strategy',
      code: 'DEPT-EXEC',
      description: 'C-Suite Leadership, Governance and Strategic Direction',
      organizationId: orgHQ.id,
      managerName: 'Alex Johnson',
      managerEmail: 'admin@uims.internal',
      status: 'ACTIVE',
    },
  });

  const deptIT = await prisma.department.upsert({
    where: { code: 'DEPT-IT' },
    update: {},
    create: {
      id: 'dept-it',
      name: 'IT & Infrastructure Operations',
      code: 'DEPT-IT',
      description: 'Enterprise IT Fleet, Identity, Cloud VPC & Network Operations',
      organizationId: orgHQ.id,
      managerName: 'Sarah Chen',
      managerEmail: 'sarah.chen@company.com',
      status: 'ACTIVE',
    },
  });

  const deptEng = await prisma.department.upsert({
    where: { code: 'DEPT-ENG' },
    update: {},
    create: {
      id: 'dept-eng',
      name: 'Engineering & Technology',
      code: 'DEPT-ENG',
      description: 'Software Architecture, Core Platform & Product Development',
      organizationId: orgHQ.id,
      managerName: 'Elena Rostova',
      managerEmail: 'elena.rostova@company.com',
      status: 'ACTIVE',
    },
  });

  const deptSec = await prisma.department.upsert({
    where: { code: 'DEPT-SEC' },
    update: {},
    create: {
      id: 'dept-sec',
      name: 'Security & Compliance',
      code: 'DEPT-SEC',
      description: 'SOC2 Type II, ISO 27001, IAM & Threat Intelligence',
      organizationId: orgHQ.id,
      managerName: 'Marcus Bell',
      managerEmail: 'compliance@uims.internal',
      status: 'ACTIVE',
    },
  });

  const deptProduct = await prisma.department.upsert({
    where: { code: 'DEPT-PROD' },
    update: {},
    create: {
      id: 'dept-prod',
      name: 'Product & Design',
      code: 'DEPT-PROD',
      description: 'Product Strategy, UX Research, UI Design & Design Systems',
      organizationId: orgHQ.id,
      managerName: 'Marcus Vance',
      managerEmail: 'marcus.vance@company.com',
      status: 'ACTIVE',
    },
  });

  const deptMarketing = await prisma.department.upsert({
    where: { code: 'DEPT-MKT' },
    update: {},
    create: {
      id: 'dept-mkt',
      name: 'Marketing',
      code: 'DEPT-MKT',
      description: 'Growth Marketing, Brand Strategy, Content & Demand Generation',
      organizationId: orgHQ.id,
      managerName: 'Elena Rostova',
      managerEmail: 'elena.rostova@company.com',
      status: 'ACTIVE',
    },
  });

  const deptFinance = await prisma.department.upsert({
    where: { code: 'DEPT-FIN' },
    update: {},
    create: {
      id: 'dept-fin',
      name: 'Finance',
      code: 'DEPT-FIN',
      description: 'Financial Planning & Analysis, Treasury, Procurement & Accounts',
      organizationId: orgAPAC.id,
      managerName: 'Lisa Wang',
      managerEmail: 'lisa.wang@company.com',
      status: 'ACTIVE',
    },
  });

  const deptHR = await prisma.department.upsert({
    where: { code: 'DEPT-HR' },
    update: {},
    create: {
      id: 'dept-hr',
      name: 'Human Resources',
      code: 'DEPT-HR',
      description: 'People Operations, Talent Acquisition, L&D & Employee Experience',
      organizationId: orgHQ.id,
      managerName: 'Rachel Adams',
      managerEmail: 'rachel.adams@company.com',
      status: 'ACTIVE',
    },
  });

  const deptLegal = await prisma.department.upsert({
    where: { code: 'DEPT-LEGAL' },
    update: {},
    create: {
      id: 'dept-legal',
      name: 'Legal & Governance',
      code: 'DEPT-LEGAL',
      description: 'Corporate Counsel, IP, Data Privacy & Regulatory Compliance',
      organizationId: orgHQ.id,
      managerName: 'James Wilson',
      managerEmail: 'james.wilson@company.com',
      status: 'ACTIVE',
    },
  });

  const deptSales = await prisma.department.upsert({
    where: { code: 'DEPT-SALES' },
    update: {},
    create: {
      id: 'dept-sales',
      name: 'Sales',
      code: 'DEPT-SALES',
      description: 'Enterprise Sales, Account Management & Revenue Operations',
      organizationId: orgHQ.id,
      managerName: 'Hannah Scott',
      managerEmail: 'hannah.scott@company.com',
      status: 'ACTIVE',
    },
  });

  // ─────────────────────────────────────────────────────────
  // 4. Sub-departments (Child Departments in Hierarchy)
  // ─────────────────────────────────────────────────────────

  // IT sub-departments
  const deptCloudOps = await prisma.department.upsert({
    where: { code: 'DEPT-IT-CLOUD' },
    update: {},
    create: {
      id: 'dept-it-cloud',
      name: 'Cloud Infrastructure & DevOps',
      code: 'DEPT-IT-CLOUD',
      description: 'AWS / GCP Multi-region infrastructure, Kubernetes & CI/CD',
      organizationId: orgHQ.id,
      parentId: deptIT.id,
      managerName: 'David Kim',
      managerEmail: 'david.kim@company.com',
      status: 'ACTIVE',
    },
  });

  const deptHelpdesk = await prisma.department.upsert({
    where: { code: 'DEPT-IT-OPS' },
    update: {},
    create: {
      id: 'dept-it-ops',
      name: 'Workplace Tech & Fleet Custody',
      code: 'DEPT-IT-OPS',
      description: 'Hardware Asset Lifecycle, Peripheral Fleet & End-User Support',
      organizationId: orgHQ.id,
      parentId: deptIT.id,
      managerName: 'Robert Torres',
      managerEmail: 'robert.torres@company.com',
      status: 'ACTIVE',
    },
  });

  const deptNetOps = await prisma.department.upsert({
    where: { code: 'DEPT-IT-NET' },
    update: {},
    create: {
      id: 'dept-it-net',
      name: 'Network & Data Center Operations',
      code: 'DEPT-IT-NET',
      description: 'WAN/LAN Architecture, IPAM, DNS & Data Center Facility Management',
      organizationId: orgHQ.id,
      parentId: deptIT.id,
      managerName: 'Michael Wong',
      managerEmail: 'michael.wong@company.com',
      status: 'ACTIVE',
    },
  });

  // Engineering sub-departments
  const deptCoreDev = await prisma.department.upsert({
    where: { code: 'DEPT-ENG-CORE' },
    update: {},
    create: {
      id: 'dept-eng-core',
      name: 'Core Platform Engineering',
      code: 'DEPT-ENG-CORE',
      description: 'High-Throughput Microservices, Distributed Systems & DB Engine',
      organizationId: orgHQ.id,
      parentId: deptEng.id,
      managerName: 'Sophia Patel',
      managerEmail: 'sophia.patel@company.com',
      status: 'ACTIVE',
    },
  });

  const deptSRE = await prisma.department.upsert({
    where: { code: 'DEPT-ENG-SRE' },
    update: {},
    create: {
      id: 'dept-eng-sre',
      name: 'Site Reliability Engineering',
      code: 'DEPT-ENG-SRE',
      description: 'SLO/SLI Monitoring, Incident Response & Production Reliability',
      organizationId: orgHQ.id,
      parentId: deptEng.id,
      managerName: 'Liam Nguyen',
      managerEmail: 'liam.nguyen@company.com',
      status: 'ACTIVE',
    },
  });

  const deptQA = await prisma.department.upsert({
    where: { code: 'DEPT-ENG-QA' },
    update: {},
    create: {
      id: 'dept-eng-qa',
      name: 'Quality Assurance & Testing',
      code: 'DEPT-ENG-QA',
      description: 'Automated Testing, E2E Suites, Performance & Security Testing',
      organizationId: orgHQ.id,
      parentId: deptEng.id,
      managerName: 'Carlos Mendez',
      managerEmail: 'carlos.mendez@company.com',
      status: 'ACTIVE',
    },
  });

  // Product & Design sub-departments
  const deptUX = await prisma.department.upsert({
    where: { code: 'DEPT-PROD-UX' },
    update: {},
    create: {
      id: 'dept-prod-ux',
      name: 'UX Research & Design',
      code: 'DEPT-PROD-UX',
      description: 'User Research, Usability Testing, Interaction & Visual Design',
      organizationId: orgHQ.id,
      parentId: deptProduct.id,
      managerName: 'Chloe Martin',
      managerEmail: 'chloe.martin@company.com',
      status: 'ACTIVE',
    },
  });

  const deptPM = await prisma.department.upsert({
    where: { code: 'DEPT-PROD-PM' },
    update: {},
    create: {
      id: 'dept-prod-pm',
      name: 'Product Management',
      code: 'DEPT-PROD-PM',
      description: 'Product Roadmap, Feature Prioritization & Stakeholder Alignment',
      organizationId: orgHQ.id,
      parentId: deptProduct.id,
      managerName: 'Marcus Vance',
      managerEmail: 'marcus.vance@company.com',
      status: 'ACTIVE',
    },
  });

  // Marketing sub-departments
  const deptGrowth = await prisma.department.upsert({
    where: { code: 'DEPT-MKT-GROWTH' },
    update: {},
    create: {
      id: 'dept-mkt-growth',
      name: 'Growth & Demand Generation',
      code: 'DEPT-MKT-GROWTH',
      description: 'Paid Acquisition, SEO/SEM, Lead Generation & Conversion Optimization',
      organizationId: orgEMEA.id,
      parentId: deptMarketing.id,
      managerName: 'Elena Rostova',
      managerEmail: 'elena.rostova@company.com',
      status: 'ACTIVE',
    },
  });

  const deptContent = await prisma.department.upsert({
    where: { code: 'DEPT-MKT-CONTENT' },
    update: {},
    create: {
      id: 'dept-mkt-content',
      name: 'Content & Brand',
      code: 'DEPT-MKT-CONTENT',
      description: 'Content Strategy, Brand Guidelines, Social Media & PR',
      organizationId: orgEMEA.id,
      parentId: deptMarketing.id,
      managerName: 'Jessica Taylor',
      managerEmail: 'jessica.taylor@company.com',
      status: 'ACTIVE',
    },
  });

  // Security sub-departments
  const deptSecOps = await prisma.department.upsert({
    where: { code: 'DEPT-SEC-OPS' },
    update: {},
    create: {
      id: 'dept-sec-ops',
      name: 'Security Operations Center',
      code: 'DEPT-SEC-OPS',
      description: 'SIEM, Threat Detection, Incident Triage & Forensic Analysis',
      organizationId: orgHQ.id,
      parentId: deptSec.id,
      managerName: 'Marcus Bell',
      managerEmail: 'compliance@uims.internal',
      status: 'ACTIVE',
    },
  });

  // Finance sub-departments
  const deptProcurement = await prisma.department.upsert({
    where: { code: 'DEPT-FIN-PROC' },
    update: {},
    create: {
      id: 'dept-fin-proc',
      name: 'Procurement & Vendor Management',
      code: 'DEPT-FIN-PROC',
      description: 'Vendor Contracts, Purchase Orders, IT Spend Optimization',
      organizationId: orgAPAC.id,
      parentId: deptFinance.id,
      managerName: 'Lisa Wang',
      managerEmail: 'lisa.wang@company.com',
      status: 'ACTIVE',
    },
  });

  // Sales sub-departments
  const deptEnterpriseSales = await prisma.department.upsert({
    where: { code: 'DEPT-SALES-ENT' },
    update: {},
    create: {
      id: 'dept-sales-ent',
      name: 'Enterprise Accounts',
      code: 'DEPT-SALES-ENT',
      description: 'Strategic Enterprise Sales, Key Account Management & Renewals',
      organizationId: orgHQ.id,
      parentId: deptSales.id,
      managerName: 'Hannah Scott',
      managerEmail: 'hannah.scott@company.com',
      status: 'ACTIVE',
    },
  });

  // ─────────────────────────────────────────────────────────
  // 5. Job Positions
  // ─────────────────────────────────────────────────────────

  // Executive
  const posCTO = await prisma.position.upsert({
    where: { code: 'POS-CTO' },
    update: {},
    create: {
      id: 'pos-cto',
      title: 'Chief Technology Officer',
      code: 'POS-CTO',
      description: 'Executive leadership across Technology and Engineering',
      departmentId: deptExecutive.id,
      level: 'Executive',
      status: 'ACTIVE',
    },
  });

  const posVPIT = await prisma.position.upsert({
    where: { code: 'POS-VP-IT' },
    update: {},
    create: {
      id: 'pos-vp-it',
      title: 'VP of Information Technology',
      code: 'POS-VP-IT',
      description: 'Executive oversight of all IT operations, security and infrastructure',
      departmentId: deptExecutive.id,
      level: 'Executive',
      status: 'ACTIVE',
    },
  });

  // IT
  const posITDirector = await prisma.position.upsert({
    where: { code: 'POS-IT-DIR' },
    update: {},
    create: {
      id: 'pos-it-dir',
      title: 'Director of IT & Asset Governance',
      code: 'POS-IT-DIR',
      description: 'Lead global IT fleet operations, license agreements & IPAM',
      departmentId: deptIT.id,
      level: 'Director',
      status: 'ACTIVE',
    },
  });

  const posSysAdmin = await prisma.position.upsert({
    where: { code: 'POS-SYSADMIN' },
    update: {},
    create: {
      id: 'pos-sysadmin',
      title: 'Senior Systems Administrator',
      code: 'POS-SYSADMIN',
      description: 'Server provisioning, OS patching, Active Directory & endpoint management',
      departmentId: deptIT.id,
      level: 'Senior',
      status: 'ACTIVE',
    },
  });

  const posNetArch = await prisma.position.upsert({
    where: { code: 'POS-NET-ARCH' },
    update: {},
    create: {
      id: 'pos-net-arch',
      title: 'Senior Network Architect',
      code: 'POS-NET-ARCH',
      description: 'WAN/LAN design, firewall policy, BGP routing & IPAM governance',
      departmentId: deptNetOps.id,
      level: 'Senior',
      status: 'ACTIVE',
    },
  });

  const posITOpsManager = await prisma.position.upsert({
    where: { code: 'POS-IT-OPS-MGR' },
    update: {},
    create: {
      id: 'pos-it-ops-mgr',
      title: 'IT Infrastructure Operations Manager',
      code: 'POS-IT-OPS-MGR',
      description: 'Oversee hardware fleet custody, helpdesk & workplace technology',
      departmentId: deptHelpdesk.id,
      level: 'Manager',
      status: 'ACTIVE',
    },
  });

  const posCloudArch = await prisma.position.upsert({
    where: { code: 'POS-CLOUD-ARCH' },
    update: {},
    create: {
      id: 'pos-cloud-arch',
      title: 'Lead Cloud Infrastructure Architect',
      code: 'POS-CLOUD-ARCH',
      description: 'Multi-Region cloud topography and high-availability architecture',
      departmentId: deptCloudOps.id,
      level: 'Lead',
      status: 'ACTIVE',
    },
  });

  const posAssetSpecialist = await prisma.position.upsert({
    where: { code: 'POS-ASSET-SPEC' },
    update: {},
    create: {
      id: 'pos-asset-spec',
      title: 'Senior Asset Management Specialist',
      code: 'POS-ASSET-SPEC',
      description: 'Hardware lifecycle, warranty tracking and audit reconciliation',
      departmentId: deptHelpdesk.id,
      level: 'Senior',
      status: 'ACTIVE',
    },
  });

  // Security
  const posLeadSecEng = await prisma.position.upsert({
    where: { code: 'POS-SEC-LEAD' },
    update: {},
    create: {
      id: 'pos-sec-lead',
      title: 'Principal Security Compliance Auditor',
      code: 'POS-SEC-LEAD',
      description: 'SOC2 Type II controls, IAM governance & zero-trust posture',
      departmentId: deptSec.id,
      level: 'Lead',
      status: 'ACTIVE',
    },
  });

  const posSecAnalyst = await prisma.position.upsert({
    where: { code: 'POS-SEC-ANALYST' },
    update: {},
    create: {
      id: 'pos-sec-analyst',
      title: 'Security Operations Analyst',
      code: 'POS-SEC-ANALYST',
      description: 'SIEM alert triage, threat hunting & incident response',
      departmentId: deptSecOps.id,
      level: 'Mid',
      status: 'ACTIVE',
    },
  });

  // Engineering
  const posSrSoftwareEng = await prisma.position.upsert({
    where: { code: 'POS-SR-SWE' },
    update: {},
    create: {
      id: 'pos-sr-swe',
      title: 'Senior Full-Stack Platform Engineer',
      code: 'POS-SR-SWE',
      description: 'TypeScript, React, NestJS and distributed data systems',
      departmentId: deptCoreDev.id,
      level: 'Senior',
      status: 'ACTIVE',
    },
  });

  const posSRELead = await prisma.position.upsert({
    where: { code: 'POS-SRE-LEAD' },
    update: {},
    create: {
      id: 'pos-sre-lead',
      title: 'Lead DevOps & SRE Architect',
      code: 'POS-SRE-LEAD',
      description: 'Kubernetes orchestration, observability stack & incident on-call',
      departmentId: deptSRE.id,
      level: 'Lead',
      status: 'ACTIVE',
    },
  });

  const posBackendEng = await prisma.position.upsert({
    where: { code: 'POS-BACKEND-ENG' },
    update: {},
    create: {
      id: 'pos-backend-eng',
      title: 'Senior Backend Platform Engineer',
      code: 'POS-BACKEND-ENG',
      description: 'API design, database optimization & microservice architecture',
      departmentId: deptCoreDev.id,
      level: 'Senior',
      status: 'ACTIVE',
    },
  });

  const posQAEng = await prisma.position.upsert({
    where: { code: 'POS-QA-ENG' },
    update: {},
    create: {
      id: 'pos-qa-eng',
      title: 'QA Engineer',
      code: 'POS-QA-ENG',
      description: 'Test automation, regression suites & quality gate enforcement',
      departmentId: deptQA.id,
      level: 'Mid',
      status: 'ACTIVE',
    },
  });

  // Product & Design
  const posPrincipalDesigner = await prisma.position.upsert({
    where: { code: 'POS-DESIGNER' },
    update: {},
    create: {
      id: 'pos-designer',
      title: 'Principal Product Designer',
      code: 'POS-DESIGNER',
      description: 'Design systems, component libraries & visual direction',
      departmentId: deptProduct.id,
      level: 'Lead',
      status: 'ACTIVE',
    },
  });

  const posUXResearcher = await prisma.position.upsert({
    where: { code: 'POS-UX-RESEARCHER' },
    update: {},
    create: {
      id: 'pos-ux-researcher',
      title: 'Senior UX Researcher',
      code: 'POS-UX-RESEARCHER',
      description: 'User interviews, usability studies & data-driven design insights',
      departmentId: deptUX.id,
      level: 'Senior',
      status: 'ACTIVE',
    },
  });

  // Marketing
  const posDirMarketing = await prisma.position.upsert({
    where: { code: 'POS-MKT-DIR' },
    update: {},
    create: {
      id: 'pos-mkt-dir',
      title: 'Director of Growth Marketing',
      code: 'POS-MKT-DIR',
      description: 'Marketing strategy, budget allocation & campaign performance',
      departmentId: deptMarketing.id,
      level: 'Director',
      status: 'ACTIVE',
    },
  });

  const posContentStrategist = await prisma.position.upsert({
    where: { code: 'POS-CONTENT' },
    update: {},
    create: {
      id: 'pos-content',
      title: 'Content Strategist',
      code: 'POS-CONTENT',
      description: 'Editorial calendar, blog content, whitepapers & brand voice',
      departmentId: deptContent.id,
      level: 'Mid',
      status: 'ACTIVE',
    },
  });

  // Finance
  const posFinController = await prisma.position.upsert({
    where: { code: 'POS-FIN-CTRL' },
    update: {},
    create: {
      id: 'pos-fin-ctrl',
      title: 'Financial Controller',
      code: 'POS-FIN-CTRL',
      description: 'Financial reporting, budget management & regulatory filings',
      departmentId: deptFinance.id,
      level: 'Manager',
      status: 'ACTIVE',
    },
  });

  // HR
  const posHRHead = await prisma.position.upsert({
    where: { code: 'POS-HR-HEAD' },
    update: {},
    create: {
      id: 'pos-hr-head',
      title: 'Head of People Operations',
      code: 'POS-HR-HEAD',
      description: 'Employee lifecycle, compensation & organizational development',
      departmentId: deptHR.id,
      level: 'Director',
      status: 'ACTIVE',
    },
  });

  // Legal
  const posSrCounsel = await prisma.position.upsert({
    where: { code: 'POS-LEGAL-SR' },
    update: {},
    create: {
      id: 'pos-legal-sr',
      title: 'Senior Corporate Counsel',
      code: 'POS-LEGAL-SR',
      description: 'Contract negotiation, IP protection & data privacy compliance',
      departmentId: deptLegal.id,
      level: 'Senior',
      status: 'ACTIVE',
    },
  });

  // Sales
  const posAccountExec = await prisma.position.upsert({
    where: { code: 'POS-SALES-AE' },
    update: {},
    create: {
      id: 'pos-sales-ae',
      title: 'Strategic Account Executive',
      code: 'POS-SALES-AE',
      description: 'Enterprise deal negotiation, pipeline management & quota attainment',
      departmentId: deptEnterpriseSales.id,
      level: 'Senior',
      status: 'ACTIVE',
    },
  });

  return {
    orgs: { orgHQ, orgEMEA, orgAPAC },
    departments: {
      deptExecutive,
      deptIT,
      deptEng,
      deptSec,
      deptProduct,
      deptMarketing,
      deptFinance,
      deptHR,
      deptLegal,
      deptSales,
      deptCloudOps,
      deptHelpdesk,
      deptNetOps,
      deptCoreDev,
      deptSRE,
      deptQA,
      deptUX,
      deptPM,
      deptGrowth,
      deptContent,
      deptSecOps,
      deptProcurement,
      deptEnterpriseSales,
    },
    positions: {
      posCTO,
      posVPIT,
      posITDirector,
      posSysAdmin,
      posNetArch,
      posITOpsManager,
      posCloudArch,
      posAssetSpecialist,
      posLeadSecEng,
      posSecAnalyst,
      posSrSoftwareEng,
      posSRELead,
      posBackendEng,
      posQAEng,
      posPrincipalDesigner,
      posUXResearcher,
      posDirMarketing,
      posContentStrategist,
      posFinController,
      posHRHead,
      posSrCounsel,
      posAccountExec,
    },
  };
}
