import {
  AppstoreOutlined,
  BankOutlined,
  ClusterOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileDoneOutlined,
  LaptopOutlined,
  PrinterOutlined,
  RollbackOutlined,
  UploadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App,
  Badge,
  Button,
  Card,
  Descriptions,
  Empty,
  Flex,
  Tabs,
  Tag,
  Typography,
  Upload,
  theme,
} from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import AppDrawer from '../../../components/AppDrawer';
import { FormattedDate } from '../../../components/FormattedDate';
import ActivityTimeline from '../../../components/ActivityTimeline';
import { type Asset, assetsService } from '../../../services/assets.service';
import { printAssetLabel } from '../utils/printAssetLabel';
import { PrintableAssetLabel } from './PrintableAssetLabel';
import { ReturnAssetModal } from './ReturnAssetModal';

const { Text } = Typography;

export interface AssetDetailDrawerProps {
  open: boolean;
  selectedAsset: Asset | null;
  onClose: () => void;
  onOpenEditModal: (asset: Asset) => void;
  onReturnAsset?: (asset: Asset) => void;
  onViewSwitchFaceplate?: (switchId?: string, portId?: string) => void;
  onViewRackElevation?: (rackId?: string, unit?: number) => void;
  onAssetUpdated?: (asset: Asset) => void;
}

export const AssetDetailDrawer: React.FC<AssetDetailDrawerProps> = React.memo(
  ({
    open,
    selectedAsset,
    onClose,
    onOpenEditModal,
    onReturnAsset,
    onViewSwitchFaceplate,
    onViewRackElevation,
    onAssetUpdated,
  }) => {
    const { token } = theme.useToken();
    const { message } = App.useApp();
    const qrContainerRef = useRef<HTMLDivElement>(null);
    const [returnModalOpen, setReturnModalOpen] = useState(false);
    const [assetData, setAssetData] = useState<Asset | null>(selectedAsset);
    const [inlineUploading, setInlineUploading] = useState(false);

    useEffect(() => {
      setAssetData(selectedAsset);
    }, [selectedAsset]);

    if (!selectedAsset || !assetData) return null;

    const handleReturnClick = () => {
      if (onReturnAsset) {
        onReturnAsset(assetData);
      } else {
        setReturnModalOpen(true);
      }
    };

    const renderDepartment = () => {
      if (!selectedAsset.department) {
        return <Text type="secondary">Unassigned</Text>;
      }
      return <Tag color="cyan">{selectedAsset.department}</Tag>;
    };

    const renderNetworkConnectivity = () => {
      const connectivity = selectedAsset.networkConnectivity;
      const connectedPort = (
        selectedAsset as unknown as {
          connectedPorts?: Array<{
            id: string;
            name: string;
            operStatus?: string;
            switchId?: string;
            vlan?: { vlanNumber: number; name: string };
            ipAddress?: { address: string };
            switch?: {
              id: string;
              name: string;
              model?: string;
              rackPosition?: number;
              rack?: { id: string; name: string };
            };
          }>;
        }
      ).connectedPorts?.[0];
      const primaryIp = (
        selectedAsset as unknown as {
          ipAddresses?: Array<{
            address: string;
            ip?: string;
            vlan?: { vlanNumber: number };
            vlanName?: string;
            switchName?: string;
            portName?: string;
            rackName?: string;
            upstreamSwitch?: {
              id: string;
              name: string;
              model?: string;
              rackPosition?: number;
              rackName?: string;
            };
            upstreamPort?: { id: string; name: string; operStatus?: string };
          }>;
        }
      ).ipAddresses?.[0];
      const linkedSwitch = (
        selectedAsset as unknown as {
          networkSwitch?: {
            id: string;
            name: string;
            model?: string;
            rackPosition?: number;
            rackId?: string;
            rack?: { id: string; name: string };
          };
        }
      ).networkSwitch;

      const switchId =
        (connectivity as unknown as { switchId?: string })?.switchId ||
        connectedPort?.switch?.id ||
        connectedPort?.switchId ||
        primaryIp?.upstreamSwitch?.id ||
        linkedSwitch?.id;

      const switchName =
        connectivity?.upstreamSwitch ||
        connectedPort?.switch?.name ||
        (connectedPort as unknown as { switchName?: string })?.switchName ||
        primaryIp?.upstreamSwitch?.name ||
        primaryIp?.switchName ||
        linkedSwitch?.name ||
        (selectedAsset as unknown as { upstreamSwitch?: string })?.upstreamSwitch;

      const switchModel =
        (connectivity as unknown as { switchModel?: string })?.switchModel ||
        connectedPort?.switch?.model ||
        primaryIp?.upstreamSwitch?.model ||
        linkedSwitch?.model;

      const portId =
        (connectivity as unknown as { portId?: string })?.portId ||
        connectedPort?.id ||
        primaryIp?.upstreamPort?.id;

      const portName =
        connectivity?.upstreamPort ||
        connectedPort?.name ||
        primaryIp?.upstreamPort?.name ||
        primaryIp?.portName ||
        (selectedAsset as unknown as { upstreamPort?: string })?.upstreamPort;

      const rawLinkStatus =
        connectivity?.linkStatus ||
        connectedPort?.operStatus ||
        primaryIp?.upstreamPort?.operStatus ||
        (selectedAsset as unknown as { linkStatus?: string })?.linkStatus ||
        'ACTIVE';

      const rackId =
        (connectivity as unknown as { rackId?: string })?.rackId ||
        connectedPort?.switch?.rack?.id ||
        linkedSwitch?.rackId ||
        linkedSwitch?.rack?.id;

      const rackName =
        connectivity?.rackName ||
        connectedPort?.switch?.rack?.name ||
        primaryIp?.upstreamSwitch?.rackName ||
        primaryIp?.rackName ||
        linkedSwitch?.rack?.name ||
        (selectedAsset as unknown as { rackName?: string })?.rackName;

      const rackUnit =
        connectivity?.rackUnit !== undefined && connectivity.rackUnit !== null
          ? connectivity.rackUnit
          : (connectedPort?.switch?.rackPosition ??
            primaryIp?.upstreamSwitch?.rackPosition ??
            linkedSwitch?.rackPosition ??
            (selectedAsset as unknown as { rackUnit?: number | string })?.rackUnit);

      const vlanDisplay =
        (connectivity as unknown as { vlan?: string })?.vlan ||
        (connectedPort?.vlan
          ? `VLAN ${connectedPort.vlan.vlanNumber} (${connectedPort.vlan.name})`
          : null) ||
        (primaryIp?.vlan ? `VLAN ${primaryIp.vlan.vlanNumber}` : null) ||
        primaryIp?.vlanName ||
        (selectedAsset as unknown as { vlan?: string })?.vlan;

      const ipDisplay =
        (connectivity as unknown as { ipAddress?: string })?.ipAddress ||
        primaryIp?.address ||
        primaryIp?.ip ||
        connectedPort?.ipAddress?.address ||
        (selectedAsset as unknown as { ipAddress?: string })?.ipAddress;

      const hasConnectivity = Boolean(switchName || portName || rackName || connectivity);

      const getStatusBadge = (
        status?: string | null,
      ): {
        status: 'success' | 'warning' | 'processing' | 'default';
        label: string;
      } => {
        const s = String(status || '').toUpperCase();
        if (s === 'ACTIVE' || s === 'UP') return { status: 'success', label: 'Active / Up' };
        if (s === 'CONNECTED_NO_SIGNAL') return { status: 'warning', label: 'Connected No Signal' };
        if (s === 'RESERVED') return { status: 'processing', label: 'Reserved' };
        return { status: 'default', label: s || 'Down' };
      };

      const linkBadge = getStatusBadge(rawLinkStatus);

      return (
        <Card
          title={
            <Flex align="center" gap={8}>
              <ClusterOutlined style={{ color: '#1677ff' }} />
              <span>Network & Rack Connectivity</span>
            </Flex>
          }
          size="small"
          style={{ marginBottom: 16 }}
          styles={{ body: { padding: '16px 20px' } }}
        >
          {hasConnectivity ? (
            <div>
              <Descriptions
                bordered
                size="small"
                column={1}
                styles={{ label: { whiteSpace: 'nowrap' } }}
              >
                <Descriptions.Item label="Upstream Switch">
                  <Flex align="center" gap={6} wrap="wrap">
                    <ClusterOutlined style={{ color: '#1677ff' }} />
                    <Text
                      strong
                      ellipsis={{ tooltip: switchName || '—' }}
                      style={{ maxWidth: 220, display: 'inline-block' }}
                    >
                      {switchName || '—'}
                    </Text>
                    {switchModel && (
                      <Tag
                        color="geekblue"
                        style={{ fontSize: 10.5, whiteSpace: 'nowrap', margin: 0 }}
                      >
                        {switchModel}
                      </Tag>
                    )}
                  </Flex>
                </Descriptions.Item>

                <Descriptions.Item label="Connected Port">
                  <Flex align="center" gap={8} wrap="wrap">
                    <Text code strong style={{ whiteSpace: 'nowrap' }}>
                      {portName || '—'}
                    </Text>
                    <Badge
                      status={linkBadge.status}
                      text={linkBadge.label}
                      style={{ whiteSpace: 'nowrap' }}
                    />
                  </Flex>
                </Descriptions.Item>

                <Descriptions.Item label="Configured VLAN & IP">
                  <Flex align="center" gap={8} wrap="wrap">
                    {vlanDisplay ? (
                      <Tag color="purple" style={{ whiteSpace: 'nowrap', margin: 0 }}>
                        {vlanDisplay}
                      </Tag>
                    ) : (
                      <Text type="secondary">—</Text>
                    )}
                    {ipDisplay ? (
                      <Text
                        code
                        copyable
                        style={{ fontSize: 11.5, color: '#1677ff', whiteSpace: 'nowrap' }}
                      >
                        {ipDisplay}
                      </Text>
                    ) : null}
                  </Flex>
                </Descriptions.Item>

                <Descriptions.Item label="Rack Cabinet & RU">
                  <Flex align="center" gap={6} wrap="wrap">
                    <AppstoreOutlined style={{ color: '#722ed1' }} />
                    <Text
                      strong
                      ellipsis={{ tooltip: rackName || 'Unassigned Rack' }}
                      style={{ maxWidth: 220, display: 'inline-block' }}
                    >
                      {rackName || 'Unassigned Rack'}
                    </Text>
                    {rackUnit !== undefined && rackUnit !== null && (
                      <Tag color="purple" style={{ whiteSpace: 'nowrap', margin: 0 }}>
                        {String(rackUnit).startsWith('U') ? String(rackUnit) : `U${rackUnit}`}
                      </Tag>
                    )}
                  </Flex>
                </Descriptions.Item>
              </Descriptions>

              <Flex gap={8} style={{ marginTop: 12 }}>
                <Button
                  size="small"
                  icon={<ClusterOutlined />}
                  onClick={() => onViewSwitchFaceplate?.(switchId, portId)}
                >
                  View in Switch Faceplate
                </Button>
                <Button
                  size="small"
                  icon={<AppstoreOutlined />}
                  onClick={() => {
                    const parsedUnit =
                      typeof rackUnit === 'number'
                        ? rackUnit
                        : parseInt(String(rackUnit).replace(/\D/g, ''), 10) || undefined;
                    onViewRackElevation?.(rackId, parsedUnit);
                  }}
                >
                  View in Rack Elevation
                </Button>
              </Flex>
            </div>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No upstream switch or rack connectivity configured"
            />
          )}
        </Card>
      );
    };

    return (
      <>
        <AppDrawer
          title={assetData.name}
          subtitle={
            assetData.model
              ? `${assetData.manufacturer} ${assetData.model}`.trim()
              : assetData.category
          }
          icon={<LaptopOutlined style={{ color: token.colorPrimary }} />}
          tag={
            <Flex align="center" gap={6}>
              <Tag color="blue">{assetData.tag}</Tag>
              {assetData.hasPendingRecord && (
                <Tag color="warning" icon={<WarningOutlined />} style={{ margin: 0 }}>
                  Pending Record
                </Tag>
              )}
            </Flex>
          }
          open={open}
          onClose={onClose}
          size={540}
          extra={
            <Flex align="center" gap={8}>
              {(assetData.assignedToId ||
                (assetData.assignedTo && assetData.assignedTo !== 'Unassigned')) && (
                <Button size="small" icon={<RollbackOutlined />} onClick={handleReturnClick}>
                  Return
                </Button>
              )}
              <Button
                type="primary"
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  onClose();
                  onOpenEditModal(assetData);
                }}
              >
                Edit
              </Button>
            </Flex>
          }
          hideFooter={true}
        >
          {assetData.hasPendingRecord && (
            <Alert
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              title="Pending Handover Record"
              description={
                <Flex vertical gap={8} style={{ marginTop: 4 }}>
                  <Text style={{ fontSize: 12 }}>
                    This asset is flagged with a pending signed handover or return document. Upload
                    the verified document below to resolve the pending status immediately.
                  </Text>
                  <Upload
                    name="file"
                    multiple={false}
                    showUploadList={false}
                    accept=".pdf,.png,.jpg,.jpeg"
                    beforeUpload={async (file) => {
                      const isValidType =
                        ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'].includes(
                          file.type.toLowerCase(),
                        ) || /\.(pdf|png|jpe?g)$/i.test(file.name);
                      if (!isValidType) {
                        message.error(
                          'Invalid file format. Only PDF, PNG, JPG, and JPEG documents are permitted.',
                        );
                        return Upload.LIST_IGNORE;
                      }
                      if (file.size === 0) {
                        message.error(
                          'The selected file is empty (0 bytes). Please select a valid document.',
                        );
                        return Upload.LIST_IGNORE;
                      }
                      const isUnder10MB = file.size / 1024 / 1024 <= 10;
                      if (!isUnder10MB) {
                        message.error('File size exceeds the 10MB limit.');
                        return Upload.LIST_IGNORE;
                      }

                      try {
                        setInlineUploading(true);
                        const res = await assetsService.uploadHandoverDocument(file, assetData.id);
                        const updated: Asset = res.asset
                          ? res.asset
                          : {
                              ...assetData,
                              hasPendingRecord: false,
                              signedDocUrl: res.fileUrl,
                            };
                        setAssetData(updated);
                        onAssetUpdated?.(updated);
                        message.success(
                          'Signed handover document uploaded. Pending status cleared.',
                        );
                      } catch (err: unknown) {
                        message.error(
                          err instanceof Error
                            ? err.message
                            : 'Failed to upload signed handover document.',
                        );
                      } finally {
                        setInlineUploading(false);
                      }
                      return false;
                    }}
                  >
                    <Button
                      size="small"
                      type="primary"
                      icon={<UploadOutlined />}
                      loading={inlineUploading}
                    >
                      Upload Signed Document
                    </Button>
                  </Upload>
                </Flex>
              }
              style={{ marginBottom: 16 }}
            />
          )}
          <Tabs
            defaultActiveKey="details"
            items={[
              {
                key: 'details',
                label: 'Details',
                children: (
                  <div>
                    <Descriptions
                      title="Asset Information"
                      bordered
                      size="small"
                      column={1}
                      styles={{ label: { whiteSpace: 'nowrap' } }}
                      style={{ marginBottom: 16 }}
                    >
                      <Descriptions.Item label="Serial Number">
                        {assetData.serialNumber ? (
                          <Text code copyable={{ text: assetData.serialNumber }}>
                            {assetData.serialNumber}
                          </Text>
                        ) : (
                          <Text type="secondary">—</Text>
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="Category">{assetData.category}</Descriptions.Item>
                      <Descriptions.Item label="Status">
                        <Tag color={assetData.status === 'Active' ? 'success' : 'warning'}>
                          {assetData.status}
                        </Tag>
                      </Descriptions.Item>
                      {(assetData.signedDocUrl || assetData.latestHandoverRecord?.signedDocUrl) && (
                        <Descriptions.Item label="Signed Document">
                          <Flex align="center" gap={8} wrap="wrap">
                            <Tag color="success" icon={<FileDoneOutlined />} style={{ margin: 0 }}>
                              Signed & Verified
                            </Tag>
                            <Button
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() => {
                                const url =
                                  assetData.signedDocUrl ||
                                  assetData.latestHandoverRecord?.signedDocUrl;
                                if (url) {
                                  window.open(url, '_blank', 'noopener,noreferrer');
                                }
                              }}
                            >
                              View Document
                            </Button>
                            <Button
                              size="small"
                              icon={<DownloadOutlined />}
                              onClick={() => {
                                const url =
                                  assetData.signedDocUrl ||
                                  assetData.latestHandoverRecord?.signedDocUrl;
                                if (url) {
                                  const a = document.createElement('a');
                                  const downloadUrl = url.includes('?')
                                    ? `${url}&download=true`
                                    : `${url}?download=true`;
                                  a.href = downloadUrl;
                                  const cleanUrl = url.split(/[?#]/)[0];
                                  const rawExt = cleanUrl.split('.').pop()?.toLowerCase();
                                  const ext =
                                    rawExt && ['pdf', 'png', 'jpg', 'jpeg'].includes(rawExt)
                                      ? rawExt
                                      : 'pdf';
                                  const safeTag = (assetData.tag || 'asset').replace(
                                    /[^a-zA-Z0-9_-]/g,
                                    '_',
                                  );
                                  a.download = `signed_record_${safeTag}.${ext}`;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                }
                              }}
                            >
                              Download
                            </Button>
                          </Flex>
                        </Descriptions.Item>
                      )}
                      <Descriptions.Item label="Unit Cost">
                        {assetData.unitCost != null ? (
                          <Text style={{ fontFamily: 'monospace' }}>
                            $
                            {assetData.unitCost.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </Text>
                        ) : (
                          <Text type="secondary">—</Text>
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="Supplier / Vendor">
                        {(assetData as unknown as { vendor?: { name?: string }; supplier?: string })
                          .vendor?.name ||
                          (assetData as unknown as { supplier?: string }).supplier ||
                          assetData.manufacturer || <Text type="secondary">—</Text>}
                      </Descriptions.Item>
                      {(assetData as unknown as { macAddress?: string }).macAddress && (
                        <Descriptions.Item label="MAC Address">
                          <Text
                            code
                            copyable={{
                              text: (assetData as unknown as { macAddress?: string }).macAddress,
                            }}
                          >
                            {(assetData as unknown as { macAddress?: string }).macAddress}
                          </Text>
                        </Descriptions.Item>
                      )}
                      {(assetData as unknown as { ipAddress?: string }).ipAddress && (
                        <Descriptions.Item label="Direct IP Address">
                          <Text
                            code
                            copyable={{
                              text: (assetData as unknown as { ipAddress?: string }).ipAddress,
                            }}
                          >
                            {(assetData as unknown as { ipAddress?: string }).ipAddress}
                          </Text>
                        </Descriptions.Item>
                      )}
                      <Descriptions.Item label="Notes">
                        {typeof assetData.notes === 'string' && assetData.notes.trim() ? (
                          <Text style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {assetData.notes}
                          </Text>
                        ) : (
                          <Text type="secondary">—</Text>
                        )}
                      </Descriptions.Item>
                    </Descriptions>

                    <Descriptions
                      title="Allocation"
                      bordered
                      size="small"
                      column={1}
                      styles={{ label: { whiteSpace: 'nowrap' } }}
                      style={{ marginBottom: 16 }}
                    >
                      {selectedAsset.organization && (
                        <Descriptions.Item label="Organization">
                          <Tag color="purple" icon={<BankOutlined />}>
                            {selectedAsset.organization}
                          </Tag>
                        </Descriptions.Item>
                      )}
                      <Descriptions.Item label="Owner Department">
                        {renderDepartment()}
                      </Descriptions.Item>
                      <Descriptions.Item label="Cost Center">
                        {selectedAsset.costCenter ? (
                          typeof selectedAsset.costCenter === 'object' ? (
                            <Tag color="geekblue">
                              {selectedAsset.costCenter.code
                                ? `${selectedAsset.costCenter.code} - ${selectedAsset.costCenter.name}`
                                : selectedAsset.costCenter.name}
                            </Tag>
                          ) : (
                            <Tag color="geekblue">{selectedAsset.costCenter}</Tag>
                          )
                        ) : (
                          <Tag color="default">Unassigned</Tag>
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="Assigned User">
                        {selectedAsset.assignedTo ? (
                          <>
                            <Typography.Text strong>{selectedAsset.assignedTo}</Typography.Text>
                            {selectedAsset.assignedEmail ? (
                              <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                                ({selectedAsset.assignedEmail})
                              </Typography.Text>
                            ) : null}
                          </>
                        ) : (
                          <Tag color="default">Unassigned</Tag>
                        )}
                      </Descriptions.Item>
                    </Descriptions>

                    {renderNetworkConnectivity()}

                    <Descriptions
                      title="Lifecycle & Warranty"
                      bordered
                      size="small"
                      column={1}
                      styles={{ label: { whiteSpace: 'nowrap' } }}
                    >
                      <Descriptions.Item label="Purchase Date">
                        <FormattedDate date={selectedAsset.purchaseDate} />
                      </Descriptions.Item>
                      <Descriptions.Item label="Warranty Expiration">
                        <FormattedDate date={selectedAsset.warrantyExpiry} />
                      </Descriptions.Item>
                    </Descriptions>
                  </div>
                ),
              },
              {
                key: 'label',
                label: 'QR Code',
                children: (
                  <Flex
                    vertical
                    align="center"
                    justify="center"
                    gap={16}
                    style={{ padding: '20px 0' }}
                  >
                    <PrintableAssetLabel asset={selectedAsset} containerRef={qrContainerRef} />
                    <Button
                      type="primary"
                      icon={<PrinterOutlined />}
                      onClick={() => printAssetLabel(selectedAsset, qrContainerRef.current)}
                    >
                      Print QR Label
                    </Button>
                  </Flex>
                ),
              },
              {
                key: 'history',
                label: 'Asset History',
                children: <ActivityTimeline entityType="Hardware" entityId={assetData.id} />,
              },
            ]}
          />
        </AppDrawer>
        {returnModalOpen && (
          <ReturnAssetModal
            open={returnModalOpen}
            asset={assetData || selectedAsset}
            onCancel={() => setReturnModalOpen(false)}
            onSuccess={() => {
              setReturnModalOpen(false);
              onClose();
              onAssetUpdated?.(assetData || selectedAsset);
            }}
          />
        )}
      </>
    );
  },
);

AssetDetailDrawer.displayName = 'AssetDetailDrawer';
