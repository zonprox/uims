import { CheckCircleOutlined, FileExcelOutlined, UploadOutlined } from '@ant-design/icons';
import type { BatchImportADResponse, BatchImportADUserItem } from '@uims/shared-types';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Flex,
  Input,
  Modal,
  Radio,
  Row,
  Table,
  Tag,
  Typography,
  Upload,
} from 'antd';
import { useState } from 'react';
import { usersService } from '../../../services/users.service';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface ImportAdModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SAMPLE_CSV_FULL = `STT,HEmploy,HName,HDesignation,HGroupCompany,Hcomp,Người Ngồi ở Xưởng,Xưởng,HDepartment,HSection,HSubSection,HEmail,HTelephone,HIsclose,Computer Name,Computer Name 2,Initial Pass,GR_GROUP USER,State
1,63020037,Phung Thi Nhu Y,Asst. Officer,BSL,BSL Others,OTH,BSL Others,Production,Printing,Printing,yptn.st@youngonevn.com,888152675,N,STOTHPR102,,kPm#*Ed8,GR_BSLOTHPrinting,ACTIVE
2,30000930,Lam Ngo Ha Vy,Asst. Officer,BSL,BSL Others,OTH,BSL Others,Production,Sample,Sample,wylnh.st@youngonevn.com,984992830,N,STOTHSAM04,,QhSt)-w8,GR_BSLOTHSample,ACTIVE
3,30100576,Le Thi Thanh Hau,Asst. Officer,BSL,BSL Others,OTH,BSL Others,Production,Sample,Sample,hauttt.st@youngonevn.com,939387051,N,STOTHSAM05,,zBbFdx?9,GR_BSLOTHSample,ACTIVE
4,66008085,Le Thi Kim Chi,Junior Technician,BSL,BSL-1,1 BSL-1,1 BSL-1,Production,Production Office,Production Office,chiltk.st@youngonevn.com,399685797,N,ST1PRO01,,mmV*$\${l4,GR_BSL1Production Office,ACTIVE
5,66018448,Son Thi Ngoc Huyen,Junior Supervisor,BSL,BSL-1,1 BSL-1,1 BSL-1,Production,Cutting,Cutting,huyenstn.st@youngonevn.com,849797929,N,ST1CUT01,,sT5aLq_8,GR_BSL1Cutting,ACTIVE`;

const SAMPLE_CSV_QUICK = `STT,Email,Name,Pass,ID,Designation,Section
1,thaotn.st@youngonevn.com,Truong Ngoc Thao,9oZCu6tgz*E#dSD,66126774,Asst. Officer,Quality Assurance
2,tuyetpn.st@youngonevn.com,Pham Ngoc Tuyet,z%5PT9Fd#E)po7q,94196912,Pattern Specialist,Sample
3,nganvtt.st@youngonevn.com,Vo Thi Thanh Ngan,F^9Fp5M*WF6Z2(e,94304825,Technician Officer,Printing
4,dulp.st@youngonevn.com,Lam Phuong Du,Za6D7d9))an#y^F,94002011,Production Supervisor,Embroidery
5,trinhntn.st@youngonevn.com,Nguyen Thi Ngoc Trinh,3^p)GwD*5L7QAcY,95003090,Supervisor Officer,Cutting`;

export function ImportAdModal({ open, onClose, onSuccess }: ImportAdModalProps) {
  const { message } = App.useApp();

  const [inputMode, setInputMode] = useState<'paste' | 'upload'>('paste');
  const [rawText, setRawText] = useState('');
  const [parsedRows, setParsedRows] = useState<BatchImportADUserItem[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<BatchImportADResponse | null>(null);

  const parseCSVContent = (content: string) => {
    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      message.warning('CSV file must have header row and at least one data row.');
      return [];
    }

    const headerLine = lines[0];
    const headers = headerLine.split(/,|\t/).map((h) => h.trim().replace(/^["']|["']$/g, ''));

    // Detect format
    const isFullFormat =
      headers.some((h) => h.includes('HEmploy') || h.includes('HName') || h.includes('Computer')) ||
      headers.length >= 8;

    const items: BatchImportADUserItem[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // Handle simple CSV splitting
      const cols = line.split(/,|\t/).map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length < 2) continue;

      if (isFullFormat) {
        // Map based on column indices or names
        const rowObj: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = cols[idx] || '';
        });

        const employeeCode =
          rowObj['HEmploy'] || rowObj['ID'] || rowObj['employeeCode'] || cols[1] || '';
        const name = rowObj['HName'] || rowObj['Name'] || cols[2] || '';
        const designation = rowObj['HDesignation'] || rowObj['Designation'] || cols[3] || '';
        const groupCompany = rowObj['HGroupCompany'] || rowObj['HGroupCompan'] || cols[4] || 'BSL';
        const company = rowObj['Hcomp'] || cols[5] || 'BSL Others';
        const plant = rowObj['Xưởng'] || rowObj['Plant'] || cols[7] || 'BSL Others';
        const department = rowObj['HDepartment'] || rowObj['Department'] || cols[8] || 'Production';
        const section = rowObj['HSection'] || rowObj['Section'] || cols[9] || '';
        const subSection = rowObj['HSubSection'] || rowObj['SubSection'] || cols[10] || section;
        const email = rowObj['HEmail'] || rowObj['Email'] || cols[11] || '';
        const telephone = rowObj['HTelephone'] || rowObj['Telephone'] || cols[12] || '';
        const isCloseVal = rowObj['HIsclose'] || cols[13] || 'N';
        const computerName = rowObj['Computer Name'] || rowObj['Computer Nan'] || cols[14] || '';
        const computerName2 = rowObj['Computer Name 2'] || cols[15] || '';
        const initialPass = rowObj['Initial Pass'] || rowObj['Pass'] || cols[16] || '';
        const adGroup = rowObj['GR_GROUP USER'] || rowObj['AD Group'] || cols[17] || '';
        const state = rowObj['State'] || cols[18] || (isCloseVal === 'Y' ? 'SUSPENDED' : 'ACTIVE');

        if (email) {
          items.push({
            stt: items.length + 1,
            employeeCode,
            name: name || email.split('@')[0],
            designation,
            groupCompany,
            company,
            plant,
            department,
            section,
            subSection,
            email,
            telephone,
            isClosed: isCloseVal === 'Y',
            computerName,
            computerName2,
            initialPassword: initialPass,
            adGroup,
            status: state,
          });
        }
      } else {
        // Quick Format: STT, Email, Name, Pass, ID, Designation, Section
        const email = cols[1] || '';
        const name = cols[2] || '';
        const pass = cols[3] || '';
        const id = cols[4] || '';
        const desig = cols[5] || 'Asst. Officer';
        const sec = cols[6] || 'Production';

        if (email) {
          items.push({
            stt: items.length + 1,
            employeeCode: id,
            name: name || email.split('@')[0],
            email,
            initialPassword: pass,
            designation: desig,
            section: sec,
            subSection: sec,
            department: 'Production',
            company: 'BSL Others',
            groupCompany: 'BSL',
            plant: 'BSL Others',
            isClosed: false,
            status: 'ACTIVE',
          });
        }
      }
    }

    return items;
  };

  const handleParseText = () => {
    if (!rawText.trim()) {
      message.warning('Please paste CSV or tab-delimited text first.');
      return;
    }
    const items = parseCSVContent(rawText);
    setParsedRows(items);
    if (items.length > 0) {
      message.success(`Parsed ${items.length} Active Directory records successfully.`);
    }
  };

  const handleLoadSample = (type: 'full' | 'quick') => {
    const sample = type === 'full' ? SAMPLE_CSV_FULL : SAMPLE_CSV_QUICK;
    setRawText(sample);
    const items = parseCSVContent(sample);
    setParsedRows(items);
    message.info(
      `Loaded ${type === 'full' ? 'Enterprise Full AD' : 'Quick Email/Pass'} sample dataset.`,
    );
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        setRawText(text);
        const items = parseCSVContent(text);
        setParsedRows(items);
        message.success(`Parsed ${items.length} records from uploaded file.`);
      }
    };
    reader.readAsText(file);
    return false; // Prevent automatic HTTP upload
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) {
      message.warning('No records to import. Please parse data first.');
      return;
    }

    setImporting(true);
    try {
      const res = await usersService.importUsers(parsedRows);
      setImportResult(res);
      message.success(
        `Active Directory Import complete: ${res.created} created, ${res.updated} updated, ${res.skipped} skipped.`,
      );
      onSuccess();
    } catch (err) {
      console.error('Import failed:', err);
      message.error('Failed to import Active Directory records.');
    } finally {
      setImporting(false);
    }
  };

  const previewColumns = [
    {
      title: 'EMP CODE',
      dataIndex: 'employeeCode',
      key: 'code',
      width: 100,
      render: (code: string) => <Tag color="blue">#{code || 'N/A'}</Tag>,
    },
    {
      title: 'FULL NAME & EMAIL',
      key: 'user',
      width: 220,
      render: (_: unknown, r: BatchImportADUserItem) => (
        <div>
          <Text strong style={{ fontSize: 12.5, display: 'block' }}>
            {r.name}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {r.email}
          </Text>
        </div>
      ),
    },
    {
      title: 'DESIGNATION',
      dataIndex: 'designation',
      key: 'designation',
      width: 140,
      render: (d: string) => <Text style={{ fontSize: 12 }}>{d || 'Employee'}</Text>,
    },
    {
      title: 'SECTION & PLANT',
      key: 'sec',
      width: 160,
      render: (_: unknown, r: BatchImportADUserItem) => (
        <div>
          <Text style={{ fontSize: 12, display: 'block' }}>{r.section || r.department}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {r.company} • {r.plant}
          </Text>
        </div>
      ),
    },
    {
      title: 'COMPUTER HOSTNAME',
      dataIndex: 'computerName',
      key: 'computerName',
      width: 130,
      render: (pc: string) =>
        pc ? (
          <Tag color="cyan" style={{ fontSize: 11 }}>
            {pc}
          </Tag>
        ) : (
          <Text type="secondary" style={{ fontSize: 11 }}>
            —
          </Text>
        ),
    },
    {
      title: 'INITIAL AD PASS',
      dataIndex: 'initialPassword',
      key: 'initialPassword',
      width: 130,
      render: (p: string) => (
        <Text code style={{ fontSize: 11 }}>
          {p || '••••••••'}
        </Text>
      ),
    },
    {
      title: 'AD SECURITY GROUP',
      dataIndex: 'adGroup',
      key: 'adGroup',
      width: 170,
      render: (g: string) =>
        g ? (
          <Tag color="purple" style={{ fontSize: 10.5 }}>
            {g}
          </Tag>
        ) : (
          <Text type="secondary" style={{ fontSize: 11 }}>
            Default
          </Text>
        ),
    },
  ];

  return (
    <Modal
      title={
        <Flex align="center" gap={10}>
          <FileExcelOutlined style={{ color: '#10b981', fontSize: 20 }} />
          <span>Active Directory & User Master Batch Importer</span>
        </Flex>
      }
      open={open}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Close
        </Button>,
        <Button
          key="import"
          type="primary"
          icon={<CheckCircleOutlined />}
          loading={importing}
          disabled={parsedRows.length === 0}
          onClick={handleExecuteImport}
        >
          Commit {parsedRows.length} Users to Active Directory
        </Button>,
      ]}
    >
      <Paragraph type="secondary" style={{ fontSize: 12.5, marginBottom: 16 }}>
        Import corporate user accounts, initial passwords, assigned computer hostnames, and AD
        security groups directly from standard enterprise Excel or CSV sheets.
      </Paragraph>

      {/* Mode and Samples Selector */}
      <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f8fafc' }}>
        <Row gutter={[12, 12]} align="middle" justify="space-between">
          <Col xs={24} md={10}>
            <Radio.Group
              value={inputMode}
              onChange={(e) => setInputMode(e.target.value)}
              buttonStyle="solid"
              size="small"
            >
              <Radio.Button value="paste">Paste CSV / TSV Text</Radio.Button>
              <Radio.Button value="upload">Upload File (.csv, .txt)</Radio.Button>
            </Radio.Group>
          </Col>
          <Col xs={24} md={14}>
            <Flex gap={8} justify="flex-end" wrap>
              <Text style={{ fontSize: 11.5 }}>Load Sample:</Text>
              <Button size="small" onClick={() => handleLoadSample('full')}>
                Full AD Master Template (19 Columns)
              </Button>
              <Button size="small" onClick={() => handleLoadSample('quick')}>
                Email / Password Quick List (7 Columns)
              </Button>
            </Flex>
          </Col>
        </Row>
      </Card>

      {inputMode === 'paste' ? (
        <div style={{ marginBottom: 16 }}>
          <TextArea
            rows={5}
            placeholder="Paste your CSV or TSV data here (with header row)..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            style={{ fontFamily: 'monospace', fontSize: 11.5 }}
          />
          <Flex justify="flex-end" style={{ marginTop: 8 }}>
            <Button type="dashed" size="small" onClick={handleParseText}>
              Parse & Preview Data
            </Button>
          </Flex>
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          <Upload.Dragger
            beforeUpload={handleFileUpload}
            showUploadList={false}
            accept=".csv,.txt,.tsv"
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined style={{ color: '#1677ff', fontSize: 32 }} />
            </p>
            <p className="ant-upload-text">Click or drag CSV master file to this area to import</p>
            <p className="ant-upload-hint">
              Supports standard enterprise AD export templates and Youngone VN formats.
            </p>
          </Upload.Dragger>
        </div>
      )}

      {/* Import Results Banner */}
      {importResult && (
        <Alert
          type={importResult.errors.length > 0 ? 'warning' : 'success'}
          showIcon
          style={{ marginBottom: 16 }}
          message={`Import Finished: ${importResult.created} accounts created, ${importResult.updated} accounts updated, ${importResult.skipped} skipped.`}
          description={
            importResult.errors.length > 0 ? (
              <div>
                <Text type="danger">Encountered {importResult.errors.length} row issues:</Text>
                <ul>
                  {importResult.errors.slice(0, 3).map((e, idx) => (
                    <li key={idx}>
                      Row {e.row} ({e.email}): {e.error}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null
          }
        />
      )}

      {/* Preview Table */}
      {parsedRows.length > 0 && (
        <div>
          <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
            <Text strong style={{ fontSize: 13 }}>
              Ready for Domain Provisioning ({parsedRows.length} accounts):
            </Text>
            <Tag color="success">Format Validated</Tag>
          </Flex>
          <Table
            columns={previewColumns}
            dataSource={parsedRows}
            rowKey={(r) => `${r.email}-${r.employeeCode}`}
            size="small"
            pagination={{ pageSize: 5, showSizeChanger: true }}
            scroll={{ x: 800 }}
          />
        </div>
      )}
    </Modal>
  );
}
