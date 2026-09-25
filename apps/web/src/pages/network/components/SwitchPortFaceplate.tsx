import { ApiOutlined, ThunderboltFilled } from '@ant-design/icons';
import { Flex, Tag, Tooltip, Typography } from 'antd';
import React, { useMemo } from 'react';
import type { NetworkSwitch, PortAdminStatus, SwitchPort } from '../../../services/network.service';

const { Text } = Typography;

export interface SwitchPortFaceplateProps {
  switchEntity?: NetworkSwitch | null;
  ports?: Array<SwitchPort>;
  totalPorts?: number;
  selectedPortId?: string | null;
  onSelectPort?: (port: SwitchPort) => void;
  loading?: boolean;
}

export interface PortStatusInfo {
  status: 'ACTIVE' | 'DOWN' | 'CONNECTED_NO_SIGNAL' | 'RESERVED';
  label: string;
  color: string;
  glow: string;
}

export function getPortStatusInfo(port?: SwitchPort | null): PortStatusInfo {
  if (!port) {
    return {
      status: 'DOWN',
      label: 'Down / Disabled',
      color: '#595959',
      glow: 'none',
    };
  }

  // Admin Down takes precedence
  if (
    port.adminStatus === 'DOWN' ||
    (port.adminStatus as unknown as PortAdminStatus) === ('DOWN' as unknown as PortAdminStatus)
  ) {
    return {
      status: 'DOWN',
      label: 'Down / Disabled',
      color: '#595959',
      glow: 'none',
    };
  }

  const oper = String(port.operStatus).toUpperCase();
  if (oper === 'ACTIVE') {
    return {
      status: 'ACTIVE',
      label: 'Active / Up',
      color: '#52c41a',
      glow: '0 0 6px #52c41a',
    };
  }
  if (oper === 'CONNECTED_NO_SIGNAL') {
    return {
      status: 'CONNECTED_NO_SIGNAL',
      label: 'Connected No Signal',
      color: '#faad14',
      glow: '0 0 6px #faad14',
    };
  }
  if (oper === 'RESERVED') {
    return {
      status: 'RESERVED',
      label: 'Reserved',
      color: '#1677ff',
      glow: '0 0 6px #1677ff',
    };
  }
  if (oper === 'DOWN') {
    return {
      status: 'DOWN',
      label: 'Down / Disabled',
      color: '#595959',
      glow: 'none',
    };
  }

  return {
    status: 'ACTIVE',
    label: 'Active / Up',
    color: '#52c41a',
    glow: '0 0 6px #52c41a',
  };
}

export const SwitchPortFaceplate: React.FC<SwitchPortFaceplateProps> = React.memo(
  ({
    switchEntity,
    ports = [],
    totalPorts: propTotalPorts,
    selectedPortId,
    onSelectPort,
    loading = false,
  }) => {
    const totalCount = propTotalPorts ?? switchEntity?.totalPorts ?? 24;
    // Standard switch sizes: 24 or 48 RJ45 ports
    const rj45Count = totalCount >= 48 ? 48 : 24;

    // Separate RJ45 access ports from SFP uplink ports
    const { rj45Ports, sfpPorts } = useMemo(() => {
      const portMap = new Map<number, SwitchPort>();
      const extraSfps: SwitchPort[] = [];

      for (const p of ports) {
        const formFactor = (p.formFactor || '').toUpperCase();
        const isSfpForm =
          formFactor.includes('SFP') || formFactor.includes('QSFP') || p.name.startsWith('Te');

        if (isSfpForm || p.portNumber > rj45Count) {
          extraSfps.push(p);
        } else {
          portMap.set(p.portNumber, p);
        }
      }

      // Ensure 1..rj45Count indexed list
      const rj45List: Array<SwitchPort | null> = [];
      for (let i = 1; i <= rj45Count; i++) {
        rj45List.push(portMap.get(i) || null);
      }

      // If no SFP ports passed but switch typically has 4 uplinks, prepare 4 slots
      const sfpList: Array<SwitchPort | null> = [];
      for (let u = 0; u < 4; u++) {
        sfpList.push(extraSfps[u] || null);
      }

      return { rj45Ports: rj45List, sfpPorts: sfpList };
    }, [ports, rj45Count]);

    // Group RJ45 ports into 12-port modular blocks
    // 24 ports = 2 blocks (ports 1-12, 13-24)
    // 48 ports = 4 blocks (ports 1-12, 13-24, 25-36, 37-48)
    const modularBlocks = useMemo(() => {
      const blocks: Array<{
        blockIndex: number;
        upperOdd: Array<{ portNum: number; port: SwitchPort | null }>;
        lowerEven: Array<{ portNum: number; port: SwitchPort | null }>;
      }> = [];

      const numBlocks = Math.ceil(rj45Count / 12);
      for (let b = 0; b < numBlocks; b++) {
        const start = b * 12 + 1;
        const upperOdd: Array<{ portNum: number; port: SwitchPort | null }> = [];
        const lowerEven: Array<{ portNum: number; port: SwitchPort | null }> = [];

        for (let i = 0; i < 12; i++) {
          const portNum = start + i;
          if (portNum > rj45Count) break;
          const port = rj45Ports[portNum - 1] || null;

          if (portNum % 2 !== 0) {
            upperOdd.push({ portNum, port });
          } else {
            lowerEven.push({ portNum, port });
          }
        }

        blocks.push({ blockIndex: b, upperOdd, lowerEven });
      }

      return blocks;
    }, [rj45Count, rj45Ports]);

    // Calculate live telemetry counts
    const telemetry = useMemo(() => {
      let active = 0;
      let down = 0;
      let noSignal = 0;
      let reserved = 0;
      let poe = 0;

      for (const p of ports) {
        const statusInfo = getPortStatusInfo(p);
        if (statusInfo.status === 'ACTIVE') active++;
        else if (statusInfo.status === 'DOWN') down++;
        else if (statusInfo.status === 'CONNECTED_NO_SIGNAL') noSignal++;
        else if (statusInfo.status === 'RESERVED') reserved++;

        if (p.poeEnabled) poe++;
      }

      return {
        total: ports.length || rj45Count + 4,
        active,
        down,
        noSignal,
        reserved,
        poe,
      };
    }, [ports, rj45Count]);

    const renderPortTooltipContent = (port: SwitchPort | null, fallbackPortNum: number) => {
      if (!port) {
        return (
          <Flex vertical gap={2} style={{ fontSize: 11, minWidth: 160 }}>
            <Text strong style={{ color: '#fff' }}>
              Port {fallbackPortNum} (Unconfigured)
            </Text>
            <Text type="secondary" style={{ color: '#aaa' }}>
              1 Gbps RJ45 · Down / Disconnected
            </Text>
          </Flex>
        );
      }

      const statusInfo = getPortStatusInfo(port);

      return (
        <Flex vertical gap={4} style={{ fontSize: 11, minWidth: 200, padding: 2 }}>
          <Flex justify="space-between" align="center">
            <Text strong style={{ color: '#fff', fontSize: 12 }}>
              {port.name || `Port ${fallbackPortNum}`}
            </Text>
            <Tag
              color={
                statusInfo.status === 'ACTIVE'
                  ? 'success'
                  : statusInfo.status === 'CONNECTED_NO_SIGNAL'
                    ? 'warning'
                    : statusInfo.status === 'RESERVED'
                      ? 'blue'
                      : 'default'
              }
              style={{ margin: 0, fontSize: 10, lineHeight: '18px', padding: '0 4px' }}
            >
              {statusInfo.label}
            </Tag>
          </Flex>

          <Flex
            vertical
            gap={1}
            style={{ color: '#d9d9d9', borderTop: '1px solid #434343', paddingTop: 4 }}
          >
            <div>
              <span style={{ color: '#8c8c8c' }}>Type:</span> {port.formFactor || 'RJ45_1G'} ·{' '}
              {port.speed || '1 Gbps'} ({port.duplex || 'Full'})
            </div>
            <div>
              <span style={{ color: '#8c8c8c' }}>VLAN:</span>{' '}
              {port.vlan?.vlanNumber
                ? `VLAN ${port.vlan.vlanNumber} (${port.vlan.name || 'Default'}) [${port.mode || 'ACCESS'}]`
                : port.vlanId
                  ? `VLAN ${port.vlanId} [${port.mode || 'ACCESS'}]`
                  : 'Untagged / Default'}
            </div>
            {port.ipAddress && (
              <div>
                <span style={{ color: '#8c8c8c' }}>Linked IP:</span>{' '}
                <span style={{ color: '#69b1ff', fontFamily: 'monospace' }}>
                  {port.ipAddress.address}
                </span>
                {port.ipAddress.hostname && (
                  <span style={{ color: '#aaa', fontSize: 10 }}> ({port.ipAddress.hostname})</span>
                )}
              </div>
            )}
            {port.connectedAsset && (
              <div>
                <span style={{ color: '#8c8c8c' }}>Connected Asset:</span>{' '}
                <span style={{ color: '#95de64' }}>
                  {port.connectedAsset.name || port.connectedAsset.assetTag}
                </span>
              </div>
            )}
            {port.poeEnabled && (
              <div style={{ color: '#fadb14' }}>
                <ThunderboltFilled style={{ marginRight: 4 }} />
                PoE: Active (802.3at PoE+)
              </div>
            )}
            {port.description && (
              <div style={{ fontStyle: 'italic', color: '#8c8c8c', fontSize: 10, marginTop: 2 }}>
                {port.description}
              </div>
            )}
          </Flex>
        </Flex>
      );
    };

    const renderRJ45Jack = (portNum: number, port: SwitchPort | null, isUpperRow: boolean) => {
      const statusInfo = getPortStatusInfo(port);
      const isSelected = selectedPortId ? port?.id === selectedPortId : false;
      const isPoe = Boolean(port?.poeEnabled);

      return (
        <Tooltip
          key={`rj45-${portNum}`}
          title={renderPortTooltipContent(port, portNum)}
          placement={isUpperRow ? 'top' : 'bottom'}
          mouseEnterDelay={0.15}
        >
          <div
            data-testid={`switch-port-${portNum}`}
            data-port-number={portNum}
            data-port-status={statusInfo.status}
            onClick={() => {
              if (port && onSelectPort) {
                onSelectPort(port);
              } else if (onSelectPort) {
                // If unconfigured slot clicked, synthesize minimal port structure
                onSelectPort({
                  id: `virtual-port-${portNum}`,
                  switchId: switchEntity?.id || 'unknown',
                  portNumber: portNum,
                  name: `Gi1/0/${portNum}`,
                  formFactor: 'RJ45_1G',
                  poeEnabled: true,
                  adminStatus: 'UP',
                  operStatus: 'DOWN',
                  mode: 'ACCESS',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                } as SwitchPort);
              }
            }}
            style={{
              width: 32,
              height: 38,
              position: 'relative',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#1b1b1b',
              border: isSelected ? '1.5px solid #1677ff' : '1px solid #333333',
              borderRadius: 3,
              boxShadow: isSelected
                ? '0 0 8px rgba(22, 119, 255, 0.8), inset 0 0 4px rgba(22, 119, 255, 0.4)'
                : 'inset 0 1px 2px rgba(0,0,0,0.6)',
              transition: 'all 0.15s ease-in-out',
              margin: '1px',
              padding: '2px 1px',
            }}
          >
            {/* LED Status Indicator */}
            <div
              data-testid={`port-led-${portNum}`}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: statusInfo.color,
                boxShadow: statusInfo.glow,
                marginBottom: isUpperRow ? 2 : 0,
                marginTop: isUpperRow ? 0 : 2,
                order: isUpperRow ? 1 : 4,
                flexShrink: 0,
              }}
            />

            {/* RJ45 Receptacle Cutout */}
            <div
              style={{
                width: 20,
                height: 16,
                backgroundColor: '#0a0a0a',
                border: '1px solid #303030',
                borderRadius: 2,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                order: 2,
              }}
            >
              {/* Gold Pin Contacts */}
              <div
                style={{
                  position: 'absolute',
                  top: isUpperRow ? 1 : 'auto',
                  bottom: isUpperRow ? 'auto' : 1,
                  display: 'flex',
                  gap: 1.5,
                }}
              >
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 1,
                      height: 3,
                      backgroundColor: '#cca043',
                      opacity: 0.8,
                    }}
                  />
                ))}
              </div>

              {/* Latch Notch */}
              <div
                style={{
                  position: 'absolute',
                  bottom: isUpperRow ? 0 : 'auto',
                  top: isUpperRow ? 'auto' : 0,
                  width: 8,
                  height: 3,
                  backgroundColor: '#1f1f1f',
                  borderTop: isUpperRow ? '1px solid #3a3a3a' : 'none',
                  borderBottom: isUpperRow ? 'none' : '1px solid #3a3a3a',
                }}
              />
            </div>

            {/* Port Number & PoE Badge */}
            <Flex
              align="center"
              justify="center"
              gap={1}
              style={{
                fontSize: 8.5,
                fontFamily: 'monospace',
                color: isSelected ? '#69b1ff' : '#8c8c8c',
                lineHeight: 1,
                marginTop: 2,
                order: 3,
              }}
            >
              {isPoe && (
                <span
                  data-testid={`poe-badge-${portNum}`}
                  style={{ color: '#fadb14', fontSize: 8, fontWeight: 'bold' }}
                >
                  ⚡
                </span>
              )}
              <span>{portNum}</span>
            </Flex>
          </div>
        </Tooltip>
      );
    };

    const renderSfpCage = (index: number, port: SwitchPort | null, labelFallback: string) => {
      const portNum = port?.portNumber ?? rj45Count + index + 1;
      const statusInfo = getPortStatusInfo(port);
      const isSelected = selectedPortId ? port?.id === selectedPortId : false;

      return (
        <Tooltip
          key={`sfp-${index}`}
          title={renderPortTooltipContent(port, portNum)}
          placement="top"
          mouseEnterDelay={0.15}
        >
          <div
            data-testid={`switch-sfp-${index + 1}`}
            data-port-number={portNum}
            data-port-status={statusInfo.status}
            onClick={() => {
              if (port && onSelectPort) {
                onSelectPort(port);
              } else if (onSelectPort) {
                onSelectPort({
                  id: `virtual-sfp-${portNum}`,
                  switchId: switchEntity?.id || 'unknown',
                  portNumber: portNum,
                  name: `Te1/0/${portNum}`,
                  formFactor: 'SFP_PLUS_10G',
                  poeEnabled: false,
                  adminStatus: 'UP',
                  operStatus: 'DOWN',
                  mode: 'TRUNK',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                } as SwitchPort);
              }
            }}
            style={{
              width: 38,
              height: 38,
              backgroundColor: '#181818',
              border: isSelected ? '1.5px solid #1677ff' : '1px solid #3a3a3a',
              borderRadius: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '3px 2px',
              cursor: 'pointer',
              boxShadow: isSelected
                ? '0 0 8px rgba(22, 119, 255, 0.8)'
                : 'inset 0 1px 3px rgba(0,0,0,0.7)',
            }}
          >
            {/* LED Status */}
            <div
              data-testid={`sfp-led-${index + 1}`}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: statusInfo.color,
                boxShadow: statusInfo.glow,
              }}
            />

            {/* SFP Transceiver Cage Socket */}
            <div
              style={{
                width: 26,
                height: 16,
                backgroundColor: '#050505',
                border: '1px solid #444',
                borderRadius: 2,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 6,
                  backgroundColor: '#262626',
                  border: '1px solid #555',
                  borderRadius: 1,
                }}
              />
            </div>

            <Text
              style={{
                fontSize: 8.5,
                fontFamily: 'monospace',
                color: isSelected ? '#69b1ff' : '#aaa',
                lineHeight: 1,
              }}
            >
              {port?.name ? port.name.replace(/^[A-Za-z]+1\/0\//, 'U') : labelFallback}
            </Text>
          </div>
        </Tooltip>
      );
    };

    return (
      <Flex vertical gap={12} style={{ width: '100%' }}>
        {/* Chassis Front Panel Enclosure */}
        <div
          data-testid="switch-faceplate-chassis"
          style={{
            position: 'relative',
            width: '100%',
            overflowX: 'auto',
            background: 'linear-gradient(180deg, #2b2b2b 0%, #1c1c1c 45%, #141414 100%)',
            border: '1px solid #383838',
            borderRadius: 6,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
            padding: '12px 14px',
            opacity: loading ? 0.6 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {/* Top Chassis Bezel Trim */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background: 'linear-gradient(90deg, #444 0%, #666 50%, #444 100%)',
              borderTopLeftRadius: 6,
              borderTopRightRadius: 6,
            }}
          />

          <Flex align="center" gap={12} style={{ minWidth: 840 }}>
            {/* Left Rack Ear Bracket */}
            <div
              style={{
                width: 24,
                height: 84,
                backgroundColor: '#282828',
                border: '1px solid #404040',
                borderRadius: '3px 0 0 3px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-around',
                alignItems: 'center',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: '#141414',
                  border: '1px solid #555',
                }}
              />
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: '#141414',
                  border: '1px solid #555',
                }}
              />
            </div>

            {/* Left Branding & System Telemetry Block */}
            <Flex
              vertical
              justify="space-between"
              style={{
                width: 170,
                height: 84,
                backgroundColor: '#181818',
                border: '1px solid #303030',
                borderRadius: 4,
                padding: '6px 10px',
                flexShrink: 0,
              }}
            >
              {/* Vendor & Model Label */}
              <Flex vertical gap={1}>
                <Flex align="center" justify="space-between">
                  <Tag
                    color="blue"
                    style={{
                      margin: 0,
                      fontWeight: 700,
                      fontSize: 10,
                      padding: '0 5px',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    {switchEntity?.vendor || 'Cisco'}
                  </Tag>
                  <Text
                    style={{
                      color: '#52c41a',
                      fontSize: 10,
                      fontFamily: 'monospace',
                      fontWeight: 600,
                    }}
                  >
                    {rj45Count}P
                  </Text>
                </Flex>
                <Text
                  strong
                  style={{
                    color: '#e5e5e5',
                    fontSize: 11.5,
                    fontFamily: 'monospace',
                    marginTop: 2,
                  }}
                  ellipsis
                >
                  {switchEntity?.model || switchEntity?.name || 'Catalyst 9300'}
                </Text>
              </Flex>

              {/* System LEDs */}
              <Flex
                justify="space-between"
                align="center"
                style={{ paddingTop: 4, borderTop: '1px solid #282828' }}
              >
                <Flex align="center" gap={3}>
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      backgroundColor: '#52c41a',
                      boxShadow: '0 0 5px #52c41a',
                    }}
                  />
                  <span style={{ fontSize: 8.5, color: '#8c8c8c', fontFamily: 'monospace' }}>
                    STAT
                  </span>
                </Flex>
                <Flex align="center" gap={3}>
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      backgroundColor: '#52c41a',
                      boxShadow: '0 0 5px #52c41a',
                    }}
                  />
                  <span style={{ fontSize: 8.5, color: '#8c8c8c', fontFamily: 'monospace' }}>
                    SYST
                  </span>
                </Flex>
                <Flex align="center" gap={3}>
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      backgroundColor: '#52c41a',
                      boxShadow: '0 0 5px #52c41a',
                    }}
                  />
                  <span style={{ fontSize: 8.5, color: '#8c8c8c', fontFamily: 'monospace' }}>
                    RPS
                  </span>
                </Flex>
                <Flex align="center" gap={3}>
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      backgroundColor: '#faad14',
                      boxShadow: '0 0 5px #faad14',
                    }}
                  />
                  <span style={{ fontSize: 8.5, color: '#faad14', fontFamily: 'monospace' }}>
                    PoE
                  </span>
                </Flex>
              </Flex>
            </Flex>

            {/* Center: Staggered RJ45 Grid in Modular 12-Port Blocks */}
            <Flex
              align="center"
              gap={8}
              style={{
                backgroundColor: '#121212',
                border: '1px solid #2b2b2b',
                borderRadius: 4,
                padding: '4px 8px',
                flexGrow: 1,
              }}
            >
              {modularBlocks.map((block) => (
                <Flex
                  key={`block-${block.blockIndex}`}
                  vertical
                  gap={2}
                  style={{
                    backgroundColor: '#161616',
                    padding: '3px 4px',
                    borderRadius: 3,
                    border: '1px solid #282828',
                  }}
                >
                  {/* Upper Row: Odd-numbered ports */}
                  <Flex gap={2}>
                    {block.upperOdd.map((item) => renderRJ45Jack(item.portNum, item.port, true))}
                  </Flex>

                  {/* Lower Row: Even-numbered ports */}
                  <Flex gap={2}>
                    {block.lowerEven.map((item) => renderRJ45Jack(item.portNum, item.port, false))}
                  </Flex>
                </Flex>
              ))}
            </Flex>

            {/* Right: SFP+ 10G Uplink Bay */}
            <Flex
              vertical
              justify="space-between"
              style={{
                width: 100,
                height: 84,
                backgroundColor: '#1a1a1a',
                border: '1px solid #383838',
                borderRadius: 4,
                padding: '4px 6px',
                flexShrink: 0,
              }}
            >
              <Flex justify="space-between" align="center">
                <Text
                  style={{
                    fontSize: 8.5,
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: '#1677ff',
                    letterSpacing: 0.5,
                  }}
                >
                  10G UPLINK
                </Text>
                <ApiOutlined style={{ fontSize: 10, color: '#1677ff' }} />
              </Flex>

              {/* 2x2 or 4x1 SFP Transceiver Grid */}
              <Flex gap={4} justify="center">
                <Flex vertical gap={3}>
                  {renderSfpCage(0, sfpPorts[0], 'U1')}
                  {renderSfpCage(1, sfpPorts[1], 'U2')}
                </Flex>
                <Flex vertical gap={3}>
                  {renderSfpCage(2, sfpPorts[2], 'U3')}
                  {renderSfpCage(3, sfpPorts[3], 'U4')}
                </Flex>
              </Flex>
            </Flex>

            {/* Right Rack Ear Bracket */}
            <div
              style={{
                width: 24,
                height: 84,
                backgroundColor: '#282828',
                border: '1px solid #404040',
                borderRadius: '0 3px 3px 0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-around',
                alignItems: 'center',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: '#141414',
                  border: '1px solid #555',
                }}
              />
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: '#141414',
                  border: '1px solid #555',
                }}
              />
            </div>
          </Flex>

          {/* Bottom Chassis Bezel Trim */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 2,
              background: 'linear-gradient(90deg, #333 0%, #444 50%, #333 100%)',
              borderBottomLeftRadius: 6,
              borderBottomRightRadius: 6,
            }}
          />
        </div>

        {/* Port Status Legend & Telemetry Summary Bar */}
        <Flex
          justify="space-between"
          align="center"
          wrap="wrap"
          gap={8}
          style={{
            padding: '6px 12px',
            backgroundColor: '#fafafa',
            border: '1px solid #f0f0f0',
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          {/* LED Indicators Legend */}
          <Flex align="center" gap={14} wrap="wrap">
            <Flex align="center" gap={5}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#52c41a',
                  boxShadow: '0 0 6px #52c41a',
                }}
              />
              <Text style={{ fontSize: 11.5 }}>Active / Up</Text>
            </Flex>

            <Flex align="center" gap={5}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#faad14',
                  boxShadow: '0 0 6px #faad14',
                }}
              />
              <Text style={{ fontSize: 11.5 }}>Connected No Signal</Text>
            </Flex>

            <Flex align="center" gap={5}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#1677ff',
                  boxShadow: '0 0 6px #1677ff',
                }}
              />
              <Text style={{ fontSize: 11.5 }}>Reserved</Text>
            </Flex>

            <Flex align="center" gap={5}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#595959',
                }}
              />
              <Text style={{ fontSize: 11.5 }}>Down / Disabled</Text>
            </Flex>

            <Flex align="center" gap={4}>
              <span style={{ color: '#faad14', fontWeight: 'bold', fontSize: 11 }}>⚡</span>
              <Text style={{ fontSize: 11.5 }}>PoE Active</Text>
            </Flex>
          </Flex>

          {/* Counts */}
          <Flex align="center" gap={8} wrap="wrap">
            <Tag color="default">Total: {telemetry.total}</Tag>
            <Tag color="success">Active: {telemetry.active}</Tag>
            <Tag color="warning">No Signal: {telemetry.noSignal}</Tag>
            <Tag color="blue">Reserved: {telemetry.reserved}</Tag>
            <Tag color="default">Down: {telemetry.down}</Tag>
            {telemetry.poe > 0 && <Tag color="gold">PoE: {telemetry.poe}</Tag>}
          </Flex>
        </Flex>
      </Flex>
    );
  },
);

SwitchPortFaceplate.displayName = 'SwitchPortFaceplate';
