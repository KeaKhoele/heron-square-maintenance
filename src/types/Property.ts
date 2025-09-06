// Property management types
export interface Property {
  id: string;
  name: string;
  address: string;
  units: number;
  createdAt: string;
  createdBy: string;
}

export interface Tenant {
  id: string;
  email: string;
  name: string;
  propertyId: string;
  unit: string;
  moveInDate: string;
  moveOutDate?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  createdBy: string;
}

export interface PropertyWithTenants extends Property {
  tenants: Tenant[];
}
