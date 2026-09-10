import { AppstoreOutlined, FilterOutlined, PlusOutlined, TableOutlined } from '@ant-design/icons';
import { Button, Card, Col, Flex, Input, Row, Segmented, Select } from 'antd';
import React, { useMemo, useState } from 'react';
import type { LocationBranch } from '../../../services/organization.service';
import type { Subnet, VLAN } from '../../../services/network.service';
import { SubnetCardList } from './SubnetCardList';
import { SubnetTable } from './SubnetTable';

const { Option } = Select;

export interface SubnetManagementTabProps {
  subnets: Array<Subnet>;
  vlans: Array<VLAN>;
  locations: Array<LocationBranch>;
  loading: boolean;
  onOpenCreateModal: () => void;
  onOpenEditModal: (subnet: Subnet) => void;
  onOpenDetailDrawer: (subnet: Subnet) => void;
  onDeleteSubnet: (id: string) => void;
}

export const SubnetManagementTab: React.FC<SubnetManagementTabProps> = React.memo(
  ({
    subnets,
    vlans,
    locations,
    loading,
    onOpenCreateModal,
    onOpenEditModal,
    onOpenDetailDrawer,
    onDeleteSubnet,
  }) => {
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [searchQuery, setSearchQuery] = useState('');
    const [locationFilter, setLocationFilter] = useState<string>('all');
    const [vlanFilter, setVlanFilter] = useState<string>('all');

    const isFiltered = searchQuery || locationFilter !== 'all' || vlanFilter !== 'all';

    const handleResetFilters = () => {
      setSearchQuery('');
      setLocationFilter('all');
      setVlanFilter('all');
    };

    const filteredSubnets = useMemo(() => {
      return subnets.filter((subnet) => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchCidr = subnet.cidr.toLowerCase().includes(q);
          const matchName = subnet.name.toLowerCase().includes(q);
          const matchGw = (subnet.gateway || '').toLowerCase().includes(q);
          if (!matchCidr && !matchName && !matchGw) return false;
        }
        if (locationFilter !== 'all') {
          if (subnet.locationId !== locationFilter) return false;
        }
        if (vlanFilter !== 'all') {
          if (subnet.vlanId !== vlanFilter && subnet.vlan?.id !== vlanFilter) return false;
        }
        return true;
      });
    }, [subnets, searchQuery, locationFilter, vlanFilter]);

    return (
      <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
        <Row gutter={[14, 14]} align="middle" justify="space-between" style={{ marginBottom: 16 }}>
          <Col xs={24} md={8}>
            <Input
              placeholder="Search subnet by CIDR, name, or gateway..."
              prefix={<FilterOutlined style={{ color: '#94a3b8' }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} md={16}>
            <Flex gap={10} justify="flex-end" wrap align="center">
              <Select
                value={locationFilter}
                onChange={setLocationFilter}
                style={{ width: 170 }}
                placeholder="Filter Location"
              >
                <Option value="all">All Locations</Option>
                {locations.map((loc) => (
                  <Option key={loc.id} value={loc.id}>
                    {loc.name}
                  </Option>
                ))}
              </Select>

              <Select
                value={vlanFilter}
                onChange={setVlanFilter}
                style={{ width: 180 }}
                placeholder="Filter VLAN"
              >
                <Option value="all">All VLANs</Option>
                {vlans.map((vlan) => (
                  <Option key={vlan.id} value={vlan.id}>
                    VLAN {vlan.vlanNumber} ({vlan.name})
                  </Option>
                ))}
              </Select>

              {isFiltered && <Button onClick={handleResetFilters}>Reset</Button>}

              <Segmented
                value={viewMode}
                onChange={(val) => setViewMode(val as 'table' | 'cards')}
                options={[
                  { label: 'Table', value: 'table', icon: <TableOutlined /> },
                  { label: 'Cards', value: 'cards', icon: <AppstoreOutlined /> },
                ]}
              />

              <Button type="primary" icon={<PlusOutlined />} onClick={onOpenCreateModal}>
                Create Subnet
              </Button>
            </Flex>
          </Col>
        </Row>

        {viewMode === 'table' ? (
          <SubnetTable
            subnets={filteredSubnets}
            loading={loading}
            onOpenDetailDrawer={onOpenDetailDrawer}
            onOpenEditModal={onOpenEditModal}
            onDeleteSubnet={onDeleteSubnet}
          />
        ) : (
          <SubnetCardList
            subnets={filteredSubnets}
            onOpenDetailDrawer={onOpenDetailDrawer}
            onOpenEditModal={onOpenEditModal}
            onDeleteSubnet={onDeleteSubnet}
          />
        )}
      </Card>
    );
  },
);

SubnetManagementTab.displayName = 'SubnetManagementTab';
