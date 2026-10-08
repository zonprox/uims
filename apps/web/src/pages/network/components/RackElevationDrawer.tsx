import { ApartmentOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Space, Tag, theme } from 'antd';
import React, { useCallback, useState } from 'react';
import AppDrawer from '../../../components/AppDrawer';
import type { NetworkRack, RackStatus } from '../../../services/network.service';
import { RackElevationView } from './RackElevationView';

export interface RackElevationDrawerProps {
  open: boolean;
  rack: NetworkRack | null;
  onClose: () => void;
  onEditRack?: (rack: NetworkRack) => void;
  onMountClick?: (unitNumber: number) => void;
  onSelectSwitch?: (switchId: string) => void;
  onDeviceUnmounted?: (deviceId: string) => void;
  onRefresh?: () => void;
}

const getStatusTag = (status: RackStatus | `${RackStatus}` | string | undefined) => {
  switch (status) {
    case 'ACTIVE':
      return <Tag color="success">Active</Tag>;
    case 'PLANNED':
      return <Tag color="processing">Planned</Tag>;
    case 'MAINTENANCE':
      return <Tag color="warning">Maintenance</Tag>;
    case 'RETIRED':
      return <Tag color="default">Retired</Tag>;
    default:
      return <Tag color="default">{status || 'Active'}</Tag>;
  }
};

export const RackElevationDrawer: React.FC<RackElevationDrawerProps> = React.memo(
  ({
    open,
    rack,
    onClose,
    onEditRack,
    onMountClick,
    onSelectSwitch,
    onDeviceUnmounted,
    onRefresh,
  }) => {
    const { token } = theme.useToken();
    const [refreshNonce, setRefreshNonce] = useState(0);

    const handleDrawerRefresh = useCallback(() => {
      setRefreshNonce((n) => n + 1);
      onRefresh?.();
    }, [onRefresh]);

    return (
      <AppDrawer
        title={rack?.name || 'Rack Elevation'}
        subtitle={rack ? `${rack.code} · ${rack.totalHeight}U Standard` : undefined}
        icon={<ApartmentOutlined style={{ fontSize: 18, color: token.colorPrimary }} />}
        tag={rack ? getStatusTag(rack.status) : undefined}
        open={open}
        onClose={onClose}
        size={820}
        cancelText="Close"
        extra={
          <Space>
            {onRefresh && (
              <Button
                icon={<ReloadOutlined />}
                onClick={handleDrawerRefresh}
                data-testid="rack-elevation-drawer-refresh"
              >
                Refresh
              </Button>
            )}
            {onEditRack && rack && (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => onEditRack(rack)}
                data-testid="rack-elevation-drawer-edit"
              >
                Edit
              </Button>
            )}
          </Space>
        }
        styles={{
          body: {
            padding: '20px 24px',
            backgroundColor: token.colorBgLayout,
            overflowX: 'auto',
          },
        }}
      >
        {rack && (
          <RackElevationView
            key={`${rack.id}-${refreshNonce}`}
            rack={rack}
            onMountClick={onMountClick}
            onSelectSwitch={onSelectSwitch}
            onDeviceUnmounted={onDeviceUnmounted}
            onRefresh={onRefresh}
          />
        )}
      </AppDrawer>
    );
  },
);

RackElevationDrawer.displayName = 'RackElevationDrawer';
