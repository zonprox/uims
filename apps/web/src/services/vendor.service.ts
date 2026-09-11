import type { Vendor } from '@uims/shared-types';
import { api } from './api';

export type { Vendor };

export const vendorService = {
  getVendors: async (): Promise<Array<Vendor>> => {
    try {
      const res = await api.get('/vendors');
      return res.data.data;
    } catch (_error: unknown) {
      return [
        {
          id: 'ven-1',
          name: 'Monoprice Inc',
          contactName: 'Sales Dept',
          contactEmail: 'sales@monoprice.com',
          contactPhone: null,
          website: 'https://monoprice.com',
          notes: 'Standard cables and accessories vendor',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'ven-2',
          name: 'CDW Direct',
          contactName: 'Enterprise Sales',
          contactEmail: 'orders@cdw.com',
          contactPhone: null,
          website: 'https://cdw.com',
          notes: 'Hardware and peripherals distributor',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    }
  },
  getVendor: async (id: string): Promise<Vendor> => {
    const res = await api.get(`/vendors/${id}`);
    return res.data.data;
  },
};
