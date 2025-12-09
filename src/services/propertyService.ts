import { Property, Tenant, PropertyWithTenants } from '../types/Property';
import { googleSheetsService } from './googleSheetsService';

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
    // Sync tenants from Google Sheets on initialization (non-blocking)
    this.syncTenantsFromSheets().catch(error => {
      console.error('Error syncing tenants from Google Sheets:', error);
    });
  }

  /**
   * Sync tenants from Google Sheets (for cross-device support)
   * Public method so components can trigger manual sync
   */
  async syncTenantsFromSheets(): Promise<void> {
    try {
      const sheetsTenants = await googleSheetsService.fetchTenants();
      if (sheetsTenants.length > 0) {
        // Merge with local tenants (Google Sheets takes precedence for conflicts)
        const mergedTenants = [...this.tenants];
        
        sheetsTenants.forEach(sheetsTenant => {
          const existingIndex = mergedTenants.findIndex(t => t.id === sheetsTenant.id || t.email.toLowerCase() === sheetsTenant.email.toLowerCase());
          if (existingIndex >= 0) {
            // Update existing tenant
            mergedTenants[existingIndex] = sheetsTenant;
          } else {
            // Add new tenant from Google Sheets
            mergedTenants.push(sheetsTenant);
          }
        });
        
        this.tenants = mergedTenants;
        this.saveToStorage();
        console.log(`Synced ${sheetsTenants.length} tenants from Google Sheets`);
      }
    } catch (error) {
      console.error('Error syncing tenants from Google Sheets:', error);
      // Continue with local tenants if sync fails
    }
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
        },
        {
          id: 'arnold-8',
          name: '8 Arnold Street',
          address: '8 Arnold Street',
          units: 6,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        },
        {
          id: 'cole-186',
          name: '186 Cole Street',
          address: '186 Cole Street',
          units: 16,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        },
        {
          id: 'franklin-5',
          name: '5 Franklin Road',
          address: '5 Franklin Road',
          units: 17,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        },
        {
          id: 'grant-2',
          name: '2 Grant Street',
          address: '2 Grant Street',
          units: 3,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        },
        {
          id: 'highbury-11',
          name: '11 Highbury Road',
          address: '11 Highbury Road',
          units: 9,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        },
        {
          id: 'lower-scott-11',
          name: '11 Lower Scott Road',
          address: '11 Lower Scott Road',
          units: 4,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        },
        {
          id: 'lynton-4',
          name: '4 Lynton Road',
          address: '4 Lynton Road',
          units: 6,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        },
        {
          id: 'lynton-6',
          name: '6 Lynton Road',
          address: '6 Lynton Road',
          units: 6,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        },
        {
          id: 'st-micheal-6',
          name: '6 St Micheal',
          address: '6 St Micheal',
          units: 3,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        },
        {
          id: 'nelson-1',
          name: '1 Nelson Road',
          address: '1 Nelson Road',
          units: 5,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        },
        {
          id: 'nelson-3',
          name: '3 Nelson Road',
          address: '3 Nelson Road',
          units: 4,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        },
        {
          id: 'nelson-4',
          name: '4 Nelson Road',
          address: '4 Nelson Road',
          units: 4,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        },
        {
          id: 'nelson-5',
          name: '5 Nelson Road',
          address: '5 Nelson Road',
          units: 4,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        },
        {
          id: 'nelson-6',
          name: '6 Nelson Road',
          address: '6 Nelson Road',
          units: 4,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        },
        {
          id: 'nelson-7',
          name: '7 Nelson Road',
          address: '7 Nelson Road',
          units: 4,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        },
        {
          id: 'nelson-8',
          name: '8 Nelson Road',
          address: '8 Nelson Road',
          units: 4,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        },
        {
          id: 'nelson-9',
          name: '9 Nelson Road',
          address: '9 Nelson Road',
          units: 4,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        },
        {
          id: 'lower-main-79',
          name: '79 Lower Main Road',
          address: '79 Lower Main Road',
          units: 23,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        },
        {
          id: 'roman-4',
          name: '4 Roman Road',
          address: '4 Roman Road',
          units: 5,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        },
        {
          id: 'roman-6',
          name: '6 Roman Road',
          address: '6 Roman Road',
          units: 12,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        },
        {
          id: 'scott-3',
          name: '3 Scott Road',
          address: '3 Scott Road',
          units: 5,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        },
        {
          id: 'stanley-17',
          name: '17 Stanley Road',
          address: '17 Stanley Road',
          units: 19,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        },
        {
          id: 'stanley-17-flatlet',
          name: '17 Stanley Road Flatlet',
          address: '17 Stanley Road Flatlet',
          units: 1,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        },
        {
          id: 'stanley-21',
          name: '21 Stanley Road',
          address: '21 Stanley Road',
          units: 15,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        },
        {
          id: 'stanley-25',
          name: '25 Stanley Road',
          address: '25 Stanley Road',
          units: 7,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        },
        {
          id: 'stanley-25a',
          name: '25A Stanley Road',
          address: '25A Stanley Road',
          units: 2,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        },
        {
          id: 'station-5',
          name: '5 Station Road',
          address: '5 Station Road',
          units: 21,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        }
      ];
      this.properties = defaultProperties;
      this.saveToStorage();
    }

    // Initialize default tenant for testing
    if (this.tenants.length === 0) {
      const defaultTenant: Tenant = {
        id: 'tenant-uct-test',
        email: 'khlkea005@myuct.ac.za',
        name: 'UCT Test User',
        propertyId: 'heron-square-1',
        unit: 'Unit 1',
        moveInDate: new Date().toISOString(),
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: 'system'
      };
      this.tenants = [defaultTenant];
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

  // Force refresh properties (useful for updating from hardcoded to dynamic)
  refreshProperties(): void {
    // Clear existing properties and reinitialize
    this.properties = [];
    this.saveToStorage();
    this.initializeDefaultProperties();
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
    // Check local storage first (fast)
    // Note: For cross-device support, use getTenantByEmailAsync() instead
    return this.tenants.find(t => t.email.toLowerCase() === email.toLowerCase());
  }
  
  /**
   * Async method to get tenant by email, fetching from Google Sheets if not found locally
   * This enables cross-device tenant authorization
   */
  async getTenantByEmailAsync(email: string): Promise<Tenant | undefined> {
    const normalizedEmail = email.toLowerCase();
    
    // Check local storage first (fast)
    const localTenant = this.tenants.find(t => t.email.toLowerCase() === normalizedEmail);
    if (localTenant) {
      return localTenant;
    }
    
    // If not found locally, fetch from Google Sheets
    try {
      const sheetsTenants = await googleSheetsService.fetchTenants();
      const sheetsTenant = sheetsTenants.find(t => t.email.toLowerCase() === normalizedEmail);
      
      if (sheetsTenant) {
        // Add to local cache for future lookups
        this.tenants.push(sheetsTenant);
        this.saveToStorage();
        return sheetsTenant;
      }
    } catch (error) {
      console.error('Error fetching tenant from Google Sheets:', error);
      // Return undefined if fetch fails
    }
    
    return undefined;
  }
  
  /**
   * Async method to check tenant authorization (checks Google Sheets if not in localStorage)
   */
  async isEmailAuthorizedAsync(email: string): Promise<boolean> {
    const tenant = await this.getTenantByEmailAsync(email);
    return tenant ? tenant.status === 'active' : false;
  }

  async addTenant(email: string, name: string, propertyId: string, unit: string, createdBy: string): Promise<Tenant> {
    // Check if tenant already exists (check both local and Google Sheets)
    const existingTenant = await this.getTenantByEmailAsync(email);
    if (existingTenant) {
      throw new Error('Tenant with this email already exists');
    }

    // Check if unit is already occupied (only if property and unit are provided)
    if (propertyId && unit) {
      const existingUnitTenant = this.tenants.find(t => 
        t.propertyId === propertyId && 
        t.unit === unit && 
        t.status === 'active'
      );
      if (existingUnitTenant) {
        throw new Error(`Unit ${unit} is already occupied by ${existingUnitTenant.name}`);
      }
    }

    const newTenant: Tenant = {
      id: `tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email: email.toLowerCase(),
      name,
      propertyId,
      unit,
      moveInDate: new Date().toISOString(),
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy
    };

    // Add to local storage
    this.tenants.push(newTenant);
    this.saveToStorage();
    
    // Sync to Google Sheets (non-blocking)
    googleSheetsService.addTenantToSheets(newTenant).catch(error => {
      console.error('Error syncing tenant to Google Sheets:', error);
      // Continue even if sync fails - tenant is saved locally
    });
    
    return newTenant;
  }

  async removeTenant(id: string): Promise<boolean> {
    const index = this.tenants.findIndex(t => t.id === id);
    if (index === -1) return false;

    const tenant = this.tenants[index];
    
    // Instead of deleting, mark as inactive (for historical record)
    // This allows cross-device sync and maintains data integrity
    const updatedTenant = {
      ...tenant,
      status: 'inactive' as const,
      moveOutDate: new Date().toISOString()
    };
    
    this.tenants[index] = updatedTenant;
    this.saveToStorage();
    
    // Sync status change to Google Sheets (non-blocking)
    googleSheetsService.updateTenantStatusInSheets(id, 'inactive').catch(error => {
      console.error('Error syncing tenant removal to Google Sheets:', error);
      // Continue even if sync fails - tenant is updated locally
    });
    
    return true;
  }

  async updateTenant(id: string, updates: Partial<Tenant>): Promise<boolean> {
    const index = this.tenants.findIndex(t => t.id === id);
    if (index === -1) return false;

    const updatedTenant = { ...this.tenants[index], ...updates };
    this.tenants[index] = updatedTenant;
    this.saveToStorage();
    
    // If status changed, sync to Google Sheets
    if (updates.status) {
      googleSheetsService.updateTenantStatusInSheets(id, updates.status).catch(error => {
        console.error('Error syncing tenant update to Google Sheets:', error);
        // Continue even if sync fails - tenant is updated locally
      });
    }
    
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
  // Note: For cross-device support, use isEmailAuthorizedAsync() instead
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
