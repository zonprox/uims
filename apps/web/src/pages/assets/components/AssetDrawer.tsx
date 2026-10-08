import React from 'react';
import { PhysicalUnitModal, type PhysicalUnitModalProps } from './PhysicalUnitModal';

export type AssetDrawerProps = PhysicalUnitModalProps;

export const AssetDrawer: React.FC<AssetDrawerProps> = (props) => {
  return <PhysicalUnitModal {...props} />;
};

AssetDrawer.displayName = 'AssetDrawer';

export default AssetDrawer;
