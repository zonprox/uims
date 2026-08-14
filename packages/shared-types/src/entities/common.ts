export interface Location {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Setting {
  key: string;
  value: string;
  description: string | null;
  isPublic: boolean;
  updatedAt: string;
}
