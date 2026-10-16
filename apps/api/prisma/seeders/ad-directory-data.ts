export interface AdDirectoryRecord {
  employeeCode: string;
  displayName: string;
  jobTitle: string;
  groupCompany: string;
  company: string;
  department: string;
  departmentCode?: string;
  positionCode?: string;
  locationCode?: string;
  section: string;
  email: string;
  telephone: string;
  isClosed: boolean;
  computerName: string;
  adGroup: string;
  status: 'ACTIVE' | 'DISABLED' | 'LOCKED' | 'SUSPENDED';
  domainJoinStatus?: 'JOINED' | 'NOT_JOINED' | 'PENDING';
  accountExpiresAt?: Date | null;
}

// Format: employeeCode|displayName|jobTitle|company|department|departmentCode|positionCode|locationCode|section|email|telephone|computerName|adGroup
const adRows: string[] = [
  'BSL-1001|Nguyen Van Minh|Cutting Section Team Leader|Broadpeak Soc Trang (BSL)|Factory 1 - Cutting Section|DEPT-BSL-F1-CUT|POS-BSL-F1-CUT-LEAD|loc-bsl-f1-cut|Automated Cutting Bay|minh.nguyen@youngonevn.com|+84 (299) 387-9101|BSL-WS-1001|GR_BSL_FactoryOperations',
  'BSL-1002|Tran Thi Mai|Sewing Assembly Line Leader|Broadpeak Soc Trang (BSL)|Factory 1 - Sewing Assembly Lines|DEPT-BSL-F1-SEW|POS-BSL-F1-SEW-SUP|loc-bsl-f1-sew|Sewing Floor 1|mai.tran@youngonevn.com|+84 (299) 387-9102|BSL-WS-1002|GR_BSL_FactoryOperations',
  'BSL-1003|Le Hoang Nam|Inline QA/QC Inspector|Broadpeak Soc Trang (BSL)|Factory 1 - Inline QA/QC Section|DEPT-BSL-F1-QA|POS-BSL-F1-QA-LEAD|loc-bsl-f1-qa|Inline Inspection|nam.le@youngonevn.com|+84 (299) 387-9103|BSL-WS-1003|GR_BSL_FactoryOperations',
  'BSL-1004|Pham Quoc Bao|Industrial IT & Automation Specialist|Broadpeak Soc Trang (BSL)|Factory IT & Industrial Automation|DEPT-BSL-IT|POS-BSL-IT-SPEC|loc-bsl-bc-datacenter|Shop Floor Automation|bao.pham@youngonevn.com|+84 (299) 387-9104|BSL-LT-1004|GR_BSL_IT_Support',
  'BSL-1005|Do Thi Lan|Central Warehouse & Fabric Supervisor|Broadpeak Soc Trang (BSL)|Central Fabric & Raw Material Store|DEPT-BSL-LOG-MAT|POS-BSL-WH-SUP|loc-bsl-wh-raw|Fabric Stockroom|lan.do@youngonevn.com|+84 (299) 387-9105|BSL-WS-1005|GR_BSL_FactoryOperations',
  'BSL-1006|Vo Minh Tri|Supply Chain & Logistics Director|Broadpeak Soc Trang (BSL)|Supply Chain & Central Warehouse Division|DEPT-BSL-LOG|POS-BSL-SC-DIR|loc-bsl-wh-fg|Export Packing Bay|tri.vo@youngonevn.com|+84 (299) 387-9106|BSL-WS-1006|GR_BSL_FactoryOperations',
  'BSL-1007|Dang Thu Ha|Plant Administration & HSE Officer|Broadpeak Soc Trang (BSL)|General Administration & Plant Affairs|DEPT-BSL-ADMIN|POS-BSL-ADMIN-LEAD|loc-bsl-bc-admin|Industrial Safety|ha.dang@youngonevn.com|+84 (299) 387-9107|BSL-LT-1007|GR_BSL_FactoryOperations',
  'BSL-1008|Bui Thanh Son|Industrial IT & Automation Specialist|Broadpeak Soc Trang (BSL)|Factory IT & Industrial Automation|DEPT-BSL-IT|POS-BSL-IT-SPEC|loc-bsl-bc-datacenter|Barcode Tracking|son.bui@youngonevn.com|+84 (299) 387-9108|BSL-HHT-1008|GR_BSL_IT_Support',
  'BSH-2001|Nguyen Duc Thinh|Global Fabric Sourcing Specialist|Broadpeak Ho Chi Minh (BSH)|Global Sourcing & Raw Material Development|DEPT-BSH-SRC|POS-BSH-SRC-SPEC|loc-bsh-d7|Global Buyer Sourcing|thinh.nguyen@youngonevn.com|+84 (28) 3997-8201|BSH-LT-2001|GR_BSH_Merchandising',
  'BSH-2002|Phan Thi My Linh|Apparel Merchandiser|Broadpeak Ho Chi Minh (BSH)|Apparel Merchandising & Buyer Accounts|DEPT-BSH-MERCH|POS-BSH-MERCH-SPEC|loc-bsh-d7|Outdoor Outerwear Accounts|linh.phan@youngonevn.com|+84 (28) 3997-8202|BSH-LT-2002|GR_BSH_Merchandising',
  'BSH-2003|Trinh Quoc Dat|Chief Accountant & Financial Controller|Broadpeak Ho Chi Minh (BSH)|Finance, Treasury & Cost Accounting|DEPT-BSH-FIN|POS-BSH-FIN-CTRL|loc-bsh-d7|Cost Accounting|dat.trinh@youngonevn.com|+84 (28) 3997-8203|BSH-LT-2003|GR_BSH_CorporateOffice',
  'BSH-2004|Vu Hoang Long|Enterprise IT Systems Architect|Broadpeak Ho Chi Minh (BSH)|Enterprise IT & Cloud Systems|DEPT-BSH-IT|POS-BSH-IT-ARCH|loc-bsh-d7|Business Applications|long.vu@youngonevn.com|+84 (28) 3997-8204|BSH-LT-2004|GR_BSH_CorporateOffice',
  'BSH-2005|Tran Ngoc Anh|Talent Acquisition & HR Manager|Broadpeak Ho Chi Minh (BSH)|People Operations & Talent Acquisition|DEPT-BSH-HR|POS-BSH-HR-MGR|loc-bsh-d7|Recruitment & Employer Branding|anh.tran@youngonevn.com|+84 (28) 3997-8205|BSH-LT-2005|GR_BSH_CorporateOffice',
  'BSH-2006|Le Thi Kim Ngan|Commercial & Sourcing Director|Broadpeak Ho Chi Minh (BSH)|Commercial & Sourcing Division|DEPT-BSH-COMM|POS-BSH-COMM-DIR|loc-bsh-d7|Executive Office|ngan.le@youngonevn.com|+84 (28) 3997-8206|BSH-LT-2006|GR_Youngone_Executive',
  'BSL-9001|Nguyen Van Hoang|Senior Pattern Engineer (Resigned)|Broadpeak Soc Trang (BSL)|Technical CAD/CAM & Sample Development|DEPT-BSL-QA-SMP|POS-BSL-CAD-SPEC|loc-bsl-st|Pattern Prototyping|hoang.nguyen@youngonevn.com|+84 (299) 387-9901|BSL-WS-9001|GR_BSL_FactoryOperations|DISABLED|NOT_JOINED|EXPIRED',
  'BSH-2009|Vu Dinh Tuan|External SAP S/4HANA Consultant|Broadpeak Ho Chi Minh (BSH)|Enterprise IT & Cloud Systems|DEPT-BSH-IT|POS-BSH-IT-ENG|loc-bsh-d7|ERP Advisory|tuan.vu@youngonevn.com|+84 (28) 3997-8209|BSH-LT-2009|GR_BSH_CorporateOffice|ACTIVE|JOINED|FUTURE_45',
  'BSH-2010|Do Thi Mai Huong|Junior Merchandiser (Onboarding)|Broadpeak Ho Chi Minh (BSH)|Apparel Merchandising & Buyer Accounts|DEPT-BSH-MERCH|POS-BSH-MERCH-SPEC|loc-bsh-d7|Apparel Sourcing|huong.do@youngonevn.com|+84 (28) 3997-8210|BSH-LT-2010|GR_BSH_Merchandising|ACTIVE|PENDING|',
];

export const enterpriseAdMasterData: Array<AdDirectoryRecord> = adRows.map((row) => {
  const [
    employeeCode,
    displayName,
    jobTitle,
    company,
    department,
    departmentCode,
    positionCode,
    locationCode,
    section,
    email,
    telephone,
    computerName,
    adGroup,
    rawStatus,
    rawJoinStatus,
    rawExpiry,
  ] = row.split('|');

  const status = (rawStatus as 'ACTIVE' | 'DISABLED' | 'LOCKED' | 'SUSPENDED') || 'ACTIVE';
  const domainJoinStatus = (rawJoinStatus as 'JOINED' | 'NOT_JOINED' | 'PENDING') || 'JOINED';
  let accountExpiresAt: Date | null = null;
  if (rawExpiry === 'EXPIRED') {
    accountExpiresAt = new Date(Date.now() - 30 * 86400000);
  } else if (rawExpiry === 'FUTURE_45') {
    accountExpiresAt = new Date(Date.now() + 45 * 86400000);
  }

  return {
    employeeCode,
    displayName,
    jobTitle,
    groupCompany: 'Youngone Corporation',
    company,
    department,
    departmentCode,
    positionCode,
    locationCode,
    section,
    email,
    telephone,
    isClosed: status === 'DISABLED' || status === 'SUSPENDED',
    computerName,
    adGroup,
    status,
    domainJoinStatus,
    accountExpiresAt,
  };
});
