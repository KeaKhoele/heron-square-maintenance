import React, { useState, useEffect } from 'react';
import { Building2, Plus, Trash2, Users, AlertCircle, CheckCircle, X } from 'lucide-react';
import { propertyService } from '../services/propertyService';
import { Property, Tenant, PropertyWithTenants } from '../types/Property';

interface TenantManagementProps {
  onClose: () => void;
}

const TenantManagement: React.FC<TenantManagementProps> = ({ onClose }) => {
  const [properties, setProperties] = useState<PropertyWithTenants[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [showRemoveProperty, setShowRemoveProperty] = useState(false);
  const [propertyToRemove, setPropertyToRemove] = useState<string>('');

  // Add Property Form
  const [newProperty, setNewProperty] = useState({
    name: '',
    address: '',
    units: 1
  });

  // Add Tenant Form
  const [newTenant, setNewTenant] = useState({
    name: '',
    email: '',
    unit: ''
  });

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = () => {
    const propertiesWithTenants = propertyService.getPropertiesWithTenants();
    setProperties(propertiesWithTenants);
    if (propertiesWithTenants.length > 0 && !selectedProperty) {
      setSelectedProperty(propertiesWithTenants[0].id);
    }
  };

  const handleAddProperty = () => {
    if (!newProperty.name || !newProperty.address || newProperty.units < 1) {
      alert('Please fill in all fields and ensure units is at least 1');
      return;
    }

    try {
      propertyService.addProperty(
        newProperty.name,
        newProperty.address,
        newProperty.units,
        'admin' // You can get this from context
      );
      
      setNewProperty({ name: '', address: '', units: 1 });
      setShowAddProperty(false);
      loadProperties();
    } catch (error) {
      alert(`Error adding property: ${error}`);
    }
  };

  const handleRemoveProperty = () => {
    if (!propertyToRemove) return;

    try {
      const success = propertyService.removeProperty(propertyToRemove);
      if (success) {
        setPropertyToRemove('');
        setShowRemoveProperty(false);
        setSelectedProperty('');
        loadProperties();
      } else {
        alert('Failed to remove property');
      }
    } catch (error) {
      alert(`Error removing property: ${error}`);
    }
  };

  const handleAddTenant = () => {
    if (!newTenant.name || !newTenant.email || !newTenant.unit || !selectedProperty) {
      alert('Please fill in all fields');
      return;
    }

    try {
      propertyService.addTenant(
        newTenant.email,
        newTenant.name,
        selectedProperty,
        newTenant.unit,
        'admin' // You can get this from context
      );
      
      setNewTenant({ name: '', email: '', unit: '' });
      setShowAddTenant(false);
      loadProperties();
    } catch (error) {
      alert(`Error adding tenant: ${error}`);
    }
  };

  const handleRemoveTenant = (tenantId: string) => {
    if (window.confirm('Are you sure you want to remove this tenant?')) {
      try {
        const success = propertyService.removeTenant(tenantId);
        if (success) {
          loadProperties();
        } else {
          alert('Failed to remove tenant');
        }
      } catch (error) {
        alert(`Error removing tenant: ${error}`);
      }
    }
  };

  const selectedPropertyData = properties.find(p => p.id === selectedProperty);
  const availableUnits = selectedPropertyData ? 
    propertyService.getAvailableUnits(selectedProperty) : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <Building2 className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">Manage Tenants</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Property Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tenant's Property
            </label>
            <div className="flex gap-2">
              <select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {properties.map(property => (
                  <option key={property.id} value={property.id}>
                    {property.name} - {property.address} ({property.units} units)
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowAddProperty(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Property
              </button>
              {properties.length > 1 && (
                <button
                  onClick={() => {
                    setPropertyToRemove(selectedProperty);
                    setShowRemoveProperty(true);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove Property
                </button>
              )}
            </div>
          </div>

          {/* Selected Property Info */}
          {selectedPropertyData && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {selectedPropertyData.name}
              </h3>
              <p className="text-gray-600 mb-2">{selectedPropertyData.address}</p>
              <p className="text-sm text-gray-500">
                {selectedPropertyData.units} units • {selectedPropertyData.tenants.length} tenants
              </p>
            </div>
          )}

          {/* Add Tenant Button */}
          <div className="mb-4">
            <button
              onClick={() => setShowAddTenant(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <Users className="h-4 w-4 mr-2" />
              Add Tenant
            </button>
          </div>

          {/* Tenants List */}
          {selectedPropertyData && (
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-gray-900">Current Tenants</h4>
              {selectedPropertyData.tenants.length === 0 ? (
                <p className="text-gray-500 italic">No tenants in this property</p>
              ) : (
                selectedPropertyData.tenants.map(tenant => (
                  <div key={tenant.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{tenant.name}</p>
                      <p className="text-sm text-gray-600">{tenant.email}</p>
                      <p className="text-sm text-gray-500">Unit {tenant.unit}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveTenant(tenant.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Add Property Modal */}
        {showAddProperty && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold mb-4">Add New Property</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property Name
                  </label>
                  <input
                    type="text"
                    value={newProperty.name}
                    onChange={(e) => setNewProperty({ ...newProperty, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Heron Square"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={newProperty.address}
                    onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 34 Arnold Street"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Units
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newProperty.units}
                    onChange={(e) => setNewProperty({ ...newProperty, units: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowAddProperty(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddProperty}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Add Property
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Tenant Modal */}
        {showAddTenant && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold mb-4">Add New Tenant</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tenant Name
                  </label>
                  <input
                    type="text"
                    value={newTenant.name}
                    onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newTenant.email}
                    onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={newTenant.unit}
                    onChange={(e) => setNewTenant({ ...newTenant, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Unit</option>
                    {availableUnits.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowAddTenant(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTenant}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Tenant
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Remove Property Confirmation */}
        {showRemoveProperty && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg p-6 w-96">
              <div className="flex items-center mb-4">
                <AlertCircle className="h-6 w-6 text-red-600 mr-2" />
                <h3 className="text-lg font-semibold text-red-600">Confirm Property Removal</h3>
              </div>
              <p className="text-gray-700 mb-4">
                Are you sure you want to remove this property? This will also remove all tenants from this property. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowRemoveProperty(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemoveProperty}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Remove Property
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantManagement;
