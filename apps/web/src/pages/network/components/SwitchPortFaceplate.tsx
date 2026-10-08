import { ApiOutlined } from '@ant-design/icons';
import { Flex, Tag, Tooltip, Typography } from 'antd';
import React, { useMemo } from 'react';
import type { NetworkSwitch, PortAdminStatus, SwitchPort } from '../../../services/network.service';
import { calculatePortClusters } from '../utils/clustering';

const { Text } = Typography;

export interface SwitchPortFaceplateProps {
  switchEntity?: NetworkSwitch | null;
  ports?: Array<SwitchPort>;
  totalPorts?: number;
  uplinkPorts?: number;
  fiberPorts?: number;
  selectedPortId?: string | null;
  onSelectPort?: (port: SwitchPort) => void;
  onPortClick?: (port: SwitchPort) => void;
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
    uplinkPorts: propUplinkPorts,
    fiberPorts: propFiberPorts,
    selectedPortId,
    onSelectPort,
    onPortClick,
    loading = false,
  }) => {
    // Arbitrary even access port count supported in [2, 48]
    const rawTotal = propTotalPorts ?? switchEntity?.totalPorts ?? 24;
    const rj45Count = Math.min(Math.max(2, Math.floor(rawTotal / 2) * 2), 48);

    // Resolve dedicated RJ45 Uplinks count (0..8)
    const finalUplinkRj45Count = useMemo(() => {
      if (propUplinkPorts !== undefined) {
        return Math.min(Math.max(0, propUplinkPorts), 8);
      }
      if (switchEntity?.uplinkPorts !== undefined && switchEntity?.uplinkPorts !== null) {
        return Math.min(Math.max(0, switchEntity.uplinkPorts), 8);
      }
      // Check if ports contains explicit RJ45 uplinks beyond access range
      const explicitRj45Uplinks = ports.filter((p) => {
        const ff = (p.formFactor || '').toUpperCase();
        const isSfp = ff.includes('SFP') || ff.includes('QSFP') || p.name.startsWith('Te');
        return (
          !isSfp &&
          (p.name.toLowerCase().includes('uplink') ||
            (p.mode === 'TRUNK' && p.portNumber > rj45Count))
        );
      });
      return explicitRj45Uplinks.length;
    }, [propUplinkPorts, switchEntity?.uplinkPorts, ports, rj45Count]);

    // Resolve SFP/SFP+ optical fiber cages count (0..8)
    const finalFiberCount = useMemo(() => {
      if (propFiberPorts !== undefined) {
        return Math.min(Math.max(0, propFiberPorts), 8);
      }
      if (switchEntity?.fiberPorts !== undefined && switchEntity?.fiberPorts !== null) {
        return Math.min(Math.max(0, switchEntity.fiberPorts), 8);
      }
      // Check if ports contains SFP ports
      const sfpInPorts = ports.filter((p) => {
        const ff = (p.formFactor || '').toUpperCase();
        return ff.includes('SFP') || ff.includes('QSFP') || p.name.startsWith('Te');
      }).length;
      if (sfpInPorts > 0) return sfpInPorts;

      // Standard enterprise switch preset: 2 for <=16 ports, 4 for >16 ports
      return rj45Count <= 16 ? 2 : 4;
    }, [propFiberPorts, switchEntity?.fiberPorts, ports, rj45Count]);

    // Partition ports into access ports, dedicated RJ45 uplinks, and optical SFP cages
    const { rj45Ports, rj45Uplinks, sfpPorts } = useMemo(() => {
      const accessPortMap = new Map<number, SwitchPort>();
      const uplinkList: SwitchPort[] = [];
      const sfpList: SwitchPort[] = [];

      for (const p of ports) {
        const formFactor = (p.formFactor || '').toUpperCase();
        const isSfpForm =
          formFactor.includes('SFP') || formFactor.includes('QSFP') || p.name.startsWith('Te');

        if (isSfpForm) {
          sfpList.push(p);
        } else if (
          p.name.toLowerCase().includes('uplink') ||
          (p.mode === 'TRUNK' && p.portNumber > rj45Count)
        ) {
          uplinkList.push(p);
        } else if (p.portNumber <= rj45Count) {
          accessPortMap.set(p.portNumber, p);
        } else {
          sfpList.push(p);
        }
      }

      sfpList.sort((a, b) => a.portNumber - b.portNumber);
      uplinkList.sort((a, b) => a.portNumber - b.portNumber);

      // Access ports 1..rj45Count indexed list
      const rj45List: Array<SwitchPort | null> = [];
      for (let i = 1; i <= rj45Count; i++) {
        rj45List.push(accessPortMap.get(i) || null);
      }

      // RJ45 Uplinks list
      const rj45UplinkSlots: Array<SwitchPort | null> = [];
      for (let u = 0; u < finalUplinkRj45Count; u++) {
        rj45UplinkSlots.push(uplinkList[u] || null);
      }

      // SFP Cages list
      const sfpSlots: Array<SwitchPort | null> = [];
      for (let s = 0; s < finalFiberCount; s++) {
        sfpSlots.push(sfpList[s] || null);
      }

      return {
        rj45Ports: rj45List,
        rj45Uplinks: rj45UplinkSlots,
        sfpPorts: sfpSlots,
      };
    }, [ports, rj45Count, finalUplinkRj45Count, finalFiberCount]);

    // Intelligent Modular Port Clustering via calculatePortClusters
    const clusterSizes = useMemo(() => calculatePortClusters(rj45Count), [rj45Count]);

    const modularBlocks = useMemo(() => {
      const blocks: Array<{
        blockIndex: number;
        upperOdd: Array<{ portNum: number; port: SwitchPort | null }>;
        lowerEven: Array<{ portNum: number; port: SwitchPort | null }>;
      }> = [];

      let portCounter = 1;
      for (let b = 0; b < clusterSizes.length; b++) {
        const size = clusterSizes[b];
        const upperOdd: Array<{ portNum: number; port: SwitchPort | null }> = [];
        const lowerEven: Array<{ portNum: number; port: SwitchPort | null }> = [];

        for (let i = 0; i < size; i++) {
          const portNum = portCounter++;
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
    }, [clusterSizes, rj45Ports]);

    // SFP Cage columns (grouped 2 per vertical column)
    const sfpColumns = useMemo(() => {
      const cols: Array<Array<{ sIndex: number; port: SwitchPort | null; label: string }>> = [];
      const numCols = Math.ceil(finalFiberCount / 2);
      for (let c = 0; c < numCols; c++) {
        const col: Array<{ sIndex: number; port: SwitchPort | null; label: string }> = [];
        const idx1 = c * 2;
        const idx2 = c * 2 + 1;
        if (idx1 < finalFiberCount) {
          col.push({ sIndex: idx1, port: sfpPorts[idx1], label: `U${idx1 + 1}` });
        }
        if (idx2 < finalFiberCount) {
          col.push({ sIndex: idx2, port: sfpPorts[idx2], label: `U${idx2 + 1}` });
        }
        cols.push(col);
      }
      return cols;
    }, [finalFiberCount, sfpPorts]);

    // RJ45 Uplink columns (grouped 2 per vertical column)
    const uplinkColumns = useMemo(() => {
      const cols: Array<Array<{ uIndex: number; port: SwitchPort | null; label: string }>> = [];
      const numCols = Math.ceil(finalUplinkRj45Count / 2);
      for (let c = 0; c < numCols; c++) {
        const col: Array<{ uIndex: number; port: SwitchPort | null; label: string }> = [];
        const idx1 = c * 2;
        const idx2 = c * 2 + 1;
        if (idx1 < finalUplinkRj45Count) {
          col.push({ uIndex: idx1, port: rj45Uplinks[idx1], label: `UP${idx1 + 1}` });
        }
        if (idx2 < finalUplinkRj45Count) {
          col.push({ uIndex: idx2, port: rj45Uplinks[idx2], label: `UP${idx2 + 1}` });
        }
        cols.push(col);
      }
      return cols;
    }, [finalUplinkRj45Count, rj45Uplinks]);

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
        total: ports.length || rj45Count + finalUplinkRj45Count + finalFiberCount,
        active,
        down,
        noSignal,
        reserved,
        poe,
      };
    }, [ports, rj45Count, finalUplinkRj45Count, finalFiberCount]);

    const handlePortActivation = (p: SwitchPort) => {
      if (onSelectPort) onSelectPort(p);
      if (onPortClick) onPortClick(p);
    };

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
              <Flex align="center" gap={5} style={{ color: '#fa8c16' }}>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: '#fa8c16',
                    boxShadow: '0 0 5px #fa8c16',
                    flexShrink: 0,
                  }}
                />
                <span>PoE Power: Active</span>
              </Flex>
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

    // Render modular dual-row access port jack with odd on top, even on bottom silkscreen numbers
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
              if (port) {
                handlePortActivation(port);
              } else {
                handlePortActivation({
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
              height: 40,
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
              padding: '1px 1px',
            }}
          >
            {/* Silkscreen Label on TOP for odd upper row sockets */}
            {isUpperRow && (
              <div
                data-testid={`port-label-${portNum}`}
                style={{
                  fontSize: 8.5,
                  fontFamily: 'monospace',
                  color: isSelected ? '#69b1ff' : '#8c8c8c',
                  lineHeight: 1,
                  marginBottom: 1,
                  order: 1,
                  textAlign: 'center',
                }}
              >
                {portNum}
              </div>
            )}

            {/* Dual Horizontal Status LEDs: Signal LED (Left) + Power/PoE LED (Right) */}
            <Flex
              align="center"
              justify="center"
              gap={3}
              data-testid={`port-led-group-${portNum}`}
              style={{
                marginBottom: isUpperRow ? 2 : 0,
                marginTop: isUpperRow ? 0 : 2,
                order: 2,
                flexShrink: 0,
                lineHeight: 1,
              }}
            >
              {/* 1. Signal / Link State LED Indicator */}
              <div
                data-testid={`port-led-${portNum}`}
                title={`Signal: ${statusInfo.label}`}
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  backgroundColor: statusInfo.color,
                  boxShadow: statusInfo.glow,
                  flexShrink: 0,
                }}
              />

              {/* 2. Power / PoE State LED Indicator (Orange when active, unlit dark gray when off) */}
              {isPoe ? (
                <div
                  data-testid={`poe-badge-${portNum}`}
                  title="PoE Power: Active"
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    backgroundColor: '#fa8c16',
                    boxShadow: '0 0 5px #fa8c16',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  data-testid={`power-led-${portNum}`}
                  title="PoE Power: Inactive"
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    backgroundColor: '#262626',
                    border: '1px solid #383838',
                    boxShadow: 'none',
                    flexShrink: 0,
                  }}
                />
              )}
            </Flex>

            {/* RJ45 Modular Receptacle with Metallic Spring Shielding Contacts */}
            <div
              style={{
                width: 20,
                height: 16,
                backgroundColor: '#0a0a0a',
                border: '1px solid #383838',
                boxShadow: 'inset 0 0 0 1px #4a4a4a, inset 0 1px 2px rgba(0,0,0,0.8)',
                borderRadius: 2,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                order: isUpperRow ? 3 : 1,
              }}
            >
              {/* Metallic Grounding Side Spring Tabs */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 3,
                  bottom: 3,
                  width: 1,
                  backgroundColor: '#777',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 3,
                  bottom: 3,
                  width: 1,
                  backgroundColor: '#777',
                }}
              />

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
                      opacity: 0.85,
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

            {/* Silkscreen Label on BOTTOM for even lower row sockets */}
            {!isUpperRow && (
              <div
                data-testid={`port-label-${portNum}`}
                style={{
                  fontSize: 8.5,
                  fontFamily: 'monospace',
                  color: isSelected ? '#69b1ff' : '#8c8c8c',
                  lineHeight: 1,
                  marginTop: 1,
                  order: 3,
                  textAlign: 'center',
                }}
              >
                {portNum}
              </div>
            )}
          </div>
        </Tooltip>
      );
    };

    // Render dedicated RJ45 Uplink socket with speed indicator LED
    const renderRj45UplinkJack = (
      uIndex: number,
      port: SwitchPort | null,
      labelFallback: string,
    ) => {
      const portNum = port?.portNumber ?? rj45Count + uIndex + 1;
      const statusInfo = getPortStatusInfo(port);
      const isSelected = selectedPortId ? port?.id === selectedPortId : false;

      return (
        <Tooltip
          key={`rj45-uplink-${uIndex}`}
          title={renderPortTooltipContent(port, portNum)}
          placement="top"
          mouseEnterDelay={0.15}
        >
          <div
            data-testid={`switch-uplink-${uIndex + 1}`}
            data-port-number={portNum}
            data-port-status={statusInfo.status}
            onClick={() => {
              if (port) {
                handlePortActivation(port);
              } else {
                handlePortActivation({
                  id: `virtual-uplink-${portNum}`,
                  switchId: switchEntity?.id || 'unknown',
                  portNumber: portNum,
                  name: `Uplink${uIndex + 1}`,
                  formFactor: 'RJ45_1G',
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
              width: 32,
              height: 38,
              boxSizing: 'border-box',
              backgroundColor: '#1b1b1b',
              border: isSelected ? '1.5px solid #1677ff' : '1px solid #3a3a3a',
              borderRadius: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '2px 1px',
              cursor: 'pointer',
              boxShadow: isSelected
                ? '0 0 8px rgba(22, 119, 255, 0.8)'
                : 'inset 0 1px 2px rgba(0,0,0,0.6)',
            }}
          >
            {/* Dual Horizontal Status LEDs: Signal LED + Power/PoE LED */}
            <Flex
              align="center"
              justify="center"
              gap={3}
              data-testid={`uplink-led-group-${uIndex + 1}`}
              style={{ lineHeight: 1 }}
            >
              <div
                data-testid={`uplink-led-${uIndex + 1}`}
                title={`Signal: ${statusInfo.label}`}
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  backgroundColor: statusInfo.color,
                  boxShadow: statusInfo.glow,
                  flexShrink: 0,
                }}
              />
              <div
                data-testid={
                  port?.poeEnabled ? `uplink-poe-${uIndex + 1}` : `uplink-power-led-${uIndex + 1}`
                }
                title={port?.poeEnabled ? 'PoE Power: Active' : 'Power: Inactive'}
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  backgroundColor: port?.poeEnabled ? '#fa8c16' : '#262626',
                  boxShadow: port?.poeEnabled ? '0 0 5px #fa8c16' : 'none',
                  border: port?.poeEnabled ? 'none' : '1px solid #383838',
                  flexShrink: 0,
                }}
              />
            </Flex>

            {/* RJ45 Receptacle */}
            <div
              style={{
                width: 20,
                height: 15,
                backgroundColor: '#0a0a0a',
                border: '1px solid #404040',
                borderRadius: 2,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 1,
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
                      opacity: 0.85,
                    }}
                  />
                ))}
              </div>
            </div>

            <Text
              style={{
                fontSize: 8,
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

    // Render authentic SFP / SFP+ optical cage with metallic frame, latch release clip, and duplex fiber icons
    const renderSfpCage = (index: number, port: SwitchPort | null, labelFallback: string) => {
      const portNum = port?.portNumber ?? rj45Count + finalUplinkRj45Count + index + 1;
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
              if (port) {
                handlePortActivation(port);
              } else {
                handlePortActivation({
                  id: `virtual-sfp-${portNum}`,
                  switchId: switchEntity?.id || 'unknown',
                  portNumber: portNum,
                  name: `Te1/0/${portNum}`,
                  formFactor: finalFiberCount === 2 ? 'SFP_1G' : 'SFP_PLUS_10G',
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
              boxSizing: 'border-box',
              backgroundColor: '#181818',
              border: isSelected ? '1.5px solid #1677ff' : '1px solid #5a5a5a',
              borderRadius: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '2px 2px',
              cursor: 'pointer',
              boxShadow: isSelected
                ? '0 0 8px rgba(22, 119, 255, 0.8)'
                : 'inset 0 1px 3px rgba(0,0,0,0.7), 0 0 2px rgba(255,255,255,0.05)',
            }}
          >
            {/* Dual Horizontal Status LEDs: Optical Link LED + Activity LED */}
            <Flex
              align="center"
              justify="center"
              gap={3}
              data-testid={`sfp-led-group-${index + 1}`}
              style={{ lineHeight: 1 }}
            >
              <div
                data-testid={`sfp-led-${index + 1}`}
                title={`Optical Link: ${statusInfo.label}`}
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  backgroundColor: statusInfo.color,
                  boxShadow: statusInfo.glow,
                  flexShrink: 0,
                }}
              />
              <div
                data-testid={`sfp-activity-led-${index + 1}`}
                title={`Activity: ${statusInfo.status === 'ACTIVE' ? 'Active' : 'Standby'}`}
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  backgroundColor: statusInfo.status === 'ACTIVE' ? '#52c41a' : '#262626',
                  boxShadow: statusInfo.status === 'ACTIVE' ? '0 0 5px #52c41a' : 'none',
                  border: statusInfo.status === 'ACTIVE' ? 'none' : '1px solid #383838',
                  flexShrink: 0,
                }}
              />
            </Flex>

            {/* SFP Optical Transceiver Cage Frame with Latch Release Clip & Duplex Fiber Icons */}
            <div
              data-testid={`sfp-cage-frame-${index + 1}`}
              style={{
                width: 26,
                height: 16,
                backgroundColor: '#050505',
                border: '1px solid #555',
                boxShadow: 'inset 0 0 0 1px #333',
                borderRadius: 2,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Metallic Latch Release Clip Styling */}
              <div
                data-testid={`sfp-latch-${index + 1}`}
                style={{
                  width: 12,
                  height: 3,
                  backgroundColor: '#262626',
                  border: '1px solid #666',
                  borderRadius: 1,
                  marginBottom: 1,
                }}
              />

              {/* Optical Duplex LC Receptacle Bores */}
              <Flex gap={3} align="center" justify="center">
                <div
                  data-testid={`sfp-fiber-left-${index + 1}`}
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    backgroundColor: '#000',
                    border: '1px solid #00b4d8',
                    boxShadow: 'inset 0 0 2px #00b4d8',
                  }}
                />
                <div
                  data-testid={`sfp-fiber-right-${index + 1}`}
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    backgroundColor: '#000',
                    border: '1px solid #00b4d8',
                    boxShadow: 'inset 0 0 2px #00b4d8',
                  }}
                />
              </Flex>
            </div>

            <Text
              data-testid={`sfp-label-${index + 1}`}
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

    // Resolve dynamic label for the Uplink / Fiber bay
    const bayTitle = useMemo(() => {
      if (finalUplinkRj45Count > 0 && finalFiberCount > 0) return 'Uplink / SFP+';
      if (finalFiberCount > 0) return 'SFP / SFP+';
      if (finalUplinkRj45Count > 0) return 'RJ45 Uplinks';
      return 'Uplink / SFP+';
    }, [finalUplinkRj45Count, finalFiberCount]);

    // Calculate Right Bay Width dynamically
    const rightBayWidth = useMemo(() => {
      const sfpCols = Math.ceil(finalFiberCount / 2);
      const uplinkCols = Math.ceil(finalUplinkRj45Count / 2);
      if (uplinkCols === 0 && sfpCols === 0) {
        return 76;
      }
      if (uplinkCols === 0) {
        return sfpCols <= 1 ? 76 : 108;
      }
      if (sfpCols === 0) {
        return uplinkCols <= 1 ? 76 : 108;
      }
      return 50 + uplinkCols * 38 + sfpCols * 44;
    }, [finalFiberCount, finalUplinkRj45Count]);

    // Calculate responsive minWidth for the main horizontal chassis flex
    const flexInnerMinWidth = useMemo(() => {
      if (finalUplinkRj45Count === 0) {
        return rj45Count <= 16 ? 560 : 840;
      }
      const base = rj45Count <= 16 ? 560 : 840;
      const extra = Math.ceil(finalUplinkRj45Count / 2) * 44;
      return base + extra;
    }, [rj45Count, finalUplinkRj45Count]);

    return (
      <Flex vertical gap={12} style={{ width: '100%' }}>
        {/* Chassis Front Panel Enclosure (Dark Brushed Metal 1U Texture) */}
        <div
          data-testid="switch-faceplate-chassis"
          style={{
            position: 'relative',
            width: '100%',
            overflowX: 'auto',
            background:
              'linear-gradient(180deg, #2f2f2f 0%, #1e1e1e 40%, #161616 70%, #111111 100%)',
            border: '1px solid #383838',
            borderRadius: 6,
            boxShadow:
              '0 8px 24px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.15), inset 0 -1px 0 rgba(0, 0, 0, 0.6)',
            padding: '12px 14px',
            opacity: loading ? 0.6 : 1,
            transition: 'opacity 0.2s',
            scrollbarWidth: 'thin',
            scrollbarColor: '#444 #1c1c1c',
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

          <Flex align="center" gap={12} style={{ minWidth: flexInnerMinWidth }}>
            {/* Left 19" Rack Ear Bracket with Mount Screw Cutouts */}
            <div
              data-testid="rack-ear-left"
              style={{
                width: 24,
                height: 104,
                boxSizing: 'border-box',
                backgroundColor: '#282828',
                background: 'linear-gradient(180deg, #323232 0%, #242424 50%, #1c1c1c 100%)',
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
                data-testid="rack-screw-left-1"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: '#141414',
                  border: '1px solid #555',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)',
                }}
              />
              <div
                data-testid="rack-screw-left-2"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: '#141414',
                  border: '1px solid #555',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)',
                }}
              />
            </div>

            {/* Left Branding, System Status Bezel (PWR, SYS, PoE LEDs + CONSOLE Port) */}
            <Flex
              vertical
              justify="space-between"
              data-testid="switch-system-bezel"
              style={{
                width: 180,
                height: 104,
                boxSizing: 'border-box',
                backgroundColor: '#181818',
                border: '1px solid #303030',
                borderRadius: 4,
                padding: '6px 8px',
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
                    fontSize: 11,
                    fontFamily: 'monospace',
                    marginTop: 2,
                  }}
                  ellipsis
                >
                  {switchEntity?.model || switchEntity?.name || 'Catalyst 9300'}
                </Text>
              </Flex>

              {/* System Status Indicators: PWR, SYS, PoE LEDs */}
              <Flex
                justify="space-between"
                align="center"
                style={{ paddingTop: 3, borderTop: '1px solid #282828' }}
              >
                <Flex align="center" gap={3}>
                  <div
                    data-testid="led-pwr"
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      backgroundColor: '#52c41a',
                      boxShadow: '0 0 5px #52c41a',
                    }}
                  />
                  <span style={{ fontSize: 8, color: '#8c8c8c', fontFamily: 'monospace' }}>
                    PWR
                  </span>
                </Flex>
                <Flex align="center" gap={3}>
                  <div
                    data-testid="led-sys"
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      backgroundColor: '#52c41a',
                      boxShadow: '0 0 5px #52c41a',
                    }}
                  />
                  <span style={{ fontSize: 8, color: '#8c8c8c', fontFamily: 'monospace' }}>
                    SYS
                  </span>
                </Flex>
                <Flex align="center" gap={3}>
                  <div
                    data-testid="led-poe"
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      backgroundColor: '#faad14',
                      boxShadow: '0 0 5px #faad14',
                    }}
                  />
                  <span style={{ fontSize: 8, color: '#faad14', fontFamily: 'monospace' }}>
                    PoE
                  </span>
                </Flex>
              </Flex>

              {/* Console Management Port Indicator */}
              <Flex
                align="center"
                gap={5}
                data-testid="console-port"
                style={{
                  paddingTop: 2,
                  borderTop: '1px solid #242424',
                }}
              >
                <div
                  data-testid="console-socket"
                  style={{
                    width: 14,
                    height: 10,
                    backgroundColor: '#0a0a0a',
                    border: '1.5px solid #096dd9',
                    borderRadius: 2,
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 4,
                      backgroundColor: '#1e1e1e',
                      border: '1px solid #333',
                      borderRadius: 1,
                    }}
                  />
                </div>
                <span
                  data-testid="console-label"
                  style={{
                    fontSize: 7.5,
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: '#096dd9',
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                  }}
                >
                  CONSOLE
                </span>
              </Flex>
            </Flex>

            {/* Center: Access Port Bay (Modular Clusters via calculatePortClusters) */}
            <Flex
              data-testid="access-port-bay"
              align="center"
              gap={8}
              style={{
                height: 104,
                boxSizing: 'border-box',
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
                  data-testid={`cluster-block-${block.blockIndex}`}
                  vertical
                  gap={2}
                  style={{
                    backgroundColor: '#161616',
                    padding: '3px 4px',
                    borderRadius: 3,
                    border: '1px solid #282828',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.6)',
                  }}
                >
                  {/* Upper Row: Odd-numbered ports (1, 3, 5...) with Silkscreen Number on TOP */}
                  <Flex gap={2}>
                    {block.upperOdd.map((item) => renderRJ45Jack(item.portNum, item.port, true))}
                  </Flex>

                  {/* Lower Row: Even-numbered ports (2, 4, 6...) with Silkscreen Number on BOTTOM */}
                  <Flex gap={2}>
                    {block.lowerEven.map((item) => renderRJ45Jack(item.portNum, item.port, false))}
                  </Flex>
                </Flex>
              ))}
            </Flex>

            {/* Metallic Dividing Bezel separating Access Bay from Uplink/Fiber Bay */}
            <div
              data-testid="metallic-dividing-bezel"
              style={{
                width: 3,
                height: 104,
                boxSizing: 'border-box',
                background: 'linear-gradient(180deg, #555 0%, #222 50%, #555 100%)',
                borderLeft: '1px solid #666',
                borderRight: '1px solid #111',
                borderRadius: 1,
                flexShrink: 0,
              }}
            />

            {/* Right: Dedicated Uplink & Fiber Bay (RJ45 Uplinks + SFP/SFP+ Optical Cages) */}
            <Flex
              vertical
              justify="flex-start"
              data-testid="right-uplink-fiber-bay"
              style={{
                width: rightBayWidth,
                height: 104,
                boxSizing: 'border-box',
                backgroundColor: '#1a1a1a',
                border: '1px solid #383838',
                borderRadius: 4,
                padding: '4px 6px',
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              <Flex
                justify="space-between"
                align="center"
                style={{
                  width: '100%',
                  height: 14,
                  lineHeight: 1,
                  padding: '0 2px',
                  marginBottom: 2,
                  flexShrink: 0,
                }}
              >
                <Text
                  style={{
                    fontSize: 8.5,
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: '#1677ff',
                    letterSpacing: 0.5,
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {bayTitle}
                </Text>
                <ApiOutlined style={{ fontSize: 9, color: '#1677ff', flexShrink: 0 }} />
              </Flex>

              <Flex
                gap={6}
                align="center"
                justify="center"
                style={{
                  width: '100%',
                  flexGrow: 1,
                }}
              >
                {/* Dedicated RJ45 Uplinks (if configured) */}
                {finalUplinkRj45Count > 0 && (
                  <Flex gap={3} data-testid="rj45-uplink-bay">
                    {uplinkColumns.map((col, colIdx) => (
                      <Flex key={`uplink-col-${colIdx}`} vertical gap={2}>
                        {col.map((item) =>
                          renderRj45UplinkJack(item.uIndex, item.port, item.label),
                        )}
                      </Flex>
                    ))}
                  </Flex>
                )}

                {/* Vertical separator between RJ45 uplinks and SFP cages */}
                {finalUplinkRj45Count > 0 && finalFiberCount > 0 && (
                  <div
                    style={{
                      width: 1,
                      height: 68,
                      backgroundColor: '#383838',
                      flexShrink: 0,
                    }}
                  />
                )}

                {/* SFP / SFP+ Optical Fiber Cages */}
                {finalFiberCount > 0 && (
                  <Flex gap={4} justify="center" data-testid="sfp-fiber-bay">
                    {sfpColumns.map((col, colIdx) => (
                      <Flex key={`sfp-col-${colIdx}`} vertical gap={2}>
                        {col.map((item) => renderSfpCage(item.sIndex, item.port, item.label))}
                      </Flex>
                    ))}
                  </Flex>
                )}
              </Flex>
            </Flex>

            {/* Right 19" Rack Ear Bracket with Mount Screw Cutouts */}
            <div
              data-testid="rack-ear-right"
              style={{
                width: 24,
                height: 104,
                boxSizing: 'border-box',
                backgroundColor: '#282828',
                background: 'linear-gradient(180deg, #323232 0%, #242424 50%, #1c1c1c 100%)',
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
                data-testid="rack-screw-right-1"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: '#141414',
                  border: '1px solid #555',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)',
                }}
              />
              <div
                data-testid="rack-screw-right-2"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: '#141414',
                  border: '1px solid #555',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)',
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

            <Flex align="center" gap={5}>
              <div
                data-testid="legend-led-poe"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#fa8c16',
                  boxShadow: '0 0 6px #fa8c16',
                }}
              />
              <Text style={{ fontSize: 11.5 }}>PoE Power Active</Text>
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
