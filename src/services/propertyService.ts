import { Property, Tenant, PropertyWithTenants } from '../types/Property';

// Property management service
export class PropertyService {
  private static instance: PropertyService;
  private properties: Property[] = [];
  private tenants: Tenant[] = [];

  static getInstance(): PropertyService {
    if (!PropertyService.instance) {
      PropertyService.instance = new PropertyService();
    }
    return PropertyService.instance;
  }

  constructor() {
    this.loadFromStorage();
    this.initializeDefaultProperties();
  }

  // Initialize default properties if none exist
  private initializeDefaultProperties(): void {
    if (this.properties.length === 0) {
      const defaultProperties: Property[] = [
        {
          id: 'heron-square-1',
          name: 'Heron Square',
          address: '34 Arnold Street',
          units: 10,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        }
      ];
      this.properties = defaultProperties;
      this.saveToStorage();
    }
  }

  // Load data from localStorage
  private loadFromStorage(): void {
    try {
      const storedProperties = localStorage.getItem('heronSquare_properties');
      const storedTenants = localStorage.getItem('heronSquare_tenants');
      
      if (storedProperties) {
        this.properties = JSON.parse(storedProperties);
      }
      
      if (storedTenants) {
        this.tenants = JSON.parse(storedTenants);
      }
    } catch (error) {
      console.error('Error loading property data from storage:', error);
      this.properties = [];
      this.tenants = [];
    }
  }

  // Save data to localStorage
  private saveToStorage(): void {
    try {
      localStorage.setItem('heronSquare_properties', JSON.stringify(this.properties));
      localStorage.setItem('heronSquare_tenants', JSON.stringify(this.tenants));
    } catch (error) {
      console.error('Error saving property data to storage:', error);
    }
  }

  // Property management
  getAllProperties(): Property[] {
    return [...this.properties];
  }

  getPropertyById(id: string): Property | undefined {
    return this.properties.find(p => p.id === id);
  }

  addProperty(name: string, address: string, units: number, createdBy: string): Property {
    const newProperty: Property = {
      id: `property-${Date.now()}`,
      name,
      address,
      units,
      createdAt: new Date().toISOString(),
      createdBy
    };

    this.properties.push(newProperty);
    this.saveToStorage();
    return newProperty;
  }

  removeProperty(id: string): boolean {
    const index = this.properties.findIndex(p => p.id === id);
    if (index === -1) return false;

    // Remove all tenants from this property
    this.tenants = this.tenants.filter(t => t.propertyId !== id);
    
    this.properties.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  updateProperty(id: string, updates: Partial<Property>): boolean {
    const index = this.properties.findIndex(p => p.id === id);
    if (index === -1) return false;

    this.properties[index] = { ...this.properties[index], ...updates };
    this.saveToStorage();
    return true;
  }

  // Tenant management
  getAllTenants(): Tenant[] {
    return [...this.tenants];
  }

  getTenantsByProperty(propertyId: string): Tenant[] {
    return this.tenants.filter(t => t.propertyId === propertyId);
  }

  getTenantByEmail(email: string): Tenant | undefined {
    return this.tenants.find(t => t.email.toLowerCase() === email.toLowerCase());
  }

  addTenant(email: string, name: string, propertyId: string, unit: string, createdBy: string): Tenant {
    // Check if tenant already exists
    const existingTenant = this.getTenantByEmail(email);
    if (existingTenant) {
      throw new Error('Tenant with this email already exists');
    }

    // Check if unit is already occupied
    const existingUnitTenant = this.tenants.find(t => 
      t.propertyId === propertyId && 
      t.unit === unit && 
      t.status === 'active'
    );
    if (existingUnitTenant) {
      throw new Error(`Unit ${unit} is already occupied by ${existingUnitTenant.name}`);
    }

    const newTenant: Tenant = {
      id: `tenant-${Date.now()}`,
      email: email.toLowerCase(),
      name,
      propertyId,
      unit,
      moveInDate: new Date().toISOString(),
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy
    };

    this.tenants.push(newTenant);
    this.saveToStorage();
    return newTenant;
  }

  removeTenant(id: string): boolean {
    const index = this.tenants.findIndex(t => t.id === id);
    if (index === -1) return false;

    this.tenants.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  updateTenant(id: string, updates: Partial<Tenant>): boolean {
    const index = this.tenants.findIndex(t => t.id === id);
    if (index === -1) return false;

    this.tenants[index] = { ...this.tenants[index], ...updates };
    this.saveToStorage();
    return true;
  }

  // Get properties with their tenants
  getPropertiesWithTenants(): PropertyWithTenants[] {
    return this.properties.map(property => ({
      ...property,
      tenants: this.getTenantsByProperty(property.id)
    }));
  }

  // Check if email is authorized (for tenant access)
  isEmailAuthorized(email: string): boolean {
    const tenant = this.getTenantByEmail(email);
    return tenant ? tenant.status === 'active' : false;
  }

  // Get available units for a property
  getAvailableUnits(propertyId: string): string[] {
    const property = this.getPropertyById(propertyId);
    if (!property) return [];

    const occupiedUnits = this.tenants
      .filter(t => t.propertyId === propertyId && t.status === 'active')
      .map(t => t.unit);

    const allUnits = Array.from({ length: property.units }, (_, i) => `Unit ${i + 1}`);
    return allUnits.filter(unit => !occupiedUnits.includes(unit));
  }
}

export const propertyService = PropertyService.getInstance();
