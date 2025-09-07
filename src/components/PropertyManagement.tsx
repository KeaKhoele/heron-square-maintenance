import React, { useState, useEffect } from 'react';
import { Building2, Plus, Trash2, AlertCircle, X } from 'lucide-react';
import { propertyService } from '../services/propertyService';
import { useNotifications } from '../contexts/NotificationContext';

interface PropertyManagementProps {
  onClose: () => void;
}

const PropertyManagement: React.FC<PropertyManagementProps> = ({ onClose }) => {
  const { showSuccess, showError } = useNotifications();
  const [properties, setProperties] = useState<Array<{id: string, address: string, units: number}>>([]);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showRemoveProperty, setShowRemoveProperty] = useState(false);
  const [propertyToRemove, setPropertyToRemove] = useState<string>('');

  // Add Property Form
  const [newProperty, setNewProperty] = useState({
    address: '',
    units: 1
  });

  useEffect(() => {
    // Force refresh properties to ensure all are loaded
    propertyService.refreshProperties();
    loadProperties();
  }, []);

  const loadProperties = () => {
    const loadedProperties = propertyService.getAllProperties();
    setProperties(loadedProperties);
  };

  const handleAddProperty = () => {
    if (!newProperty.address.trim()) {
      showError('Validation Error', 'Please enter a property address');
      return;
    }
    
    if (newProperty.units < 1) {
      showError('Validation Error', 'Number of units must be at least 1');
      return;
    }

    try {
      propertyService.addProperty(
        newProperty.address, // Use address as name
        newProperty.address,
        newProperty.units,
        'admin' // You can get this from context
      );
      
      setNewProperty({ address: '', units: 1 });
      setShowAddProperty(false);
      loadProperties();
      showSuccess('Success', 'Property added successfully!');
    } catch (error) {
      showError('Add Property Failed', `Error adding property: ${error}`);
    }
  };

  const handleRemoveProperty = () => {
    if (!propertyToRemove) return;

    try {
      const success = propertyService.removeProperty(propertyToRemove);
      if (success) {
        setPropertyToRemove('');
        setShowRemoveProperty(false);
        loadProperties();
        showSuccess('Success', 'Property removed successfully!');
      } else {
        showError('Remove Property Failed', 'Failed to remove property');
      }
    } catch (error) {
      showError('Remove Property Failed', `Error removing property: ${error}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b">
          <div className="flex items-center">
            <Building2 className="h-6 w-6 text-green-600 mr-3" />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Property Management</h2>
              <p className="text-xs sm:text-sm text-gray-600">Manage properties available in issue submission forms</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Add Property Button */}
          <div className="mb-6">
            <button
              onClick={() => setShowAddProperty(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </button>
          </div>

          {/* Properties List */}
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-gray-900">Current Properties</h4>
            {properties.length === 0 ? (
              <p className="text-gray-500 italic">No properties added yet</p>
            ) : (
              properties.map(property => (
                <div key={property.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{property.address}</p>
                    <p className="text-sm text-gray-500">{property.units} units</p>
                  </div>
                  <button
                    onClick={() => {
                      setPropertyToRemove(property.id);
                      setShowRemoveProperty(true);
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Add Property Modal */}
        {showAddProperty && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold mb-4">Add New Property</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property Address
                  </label>
                  <input
                    type="text"
                    value={newProperty.address}
                    onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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

export default PropertyManagement;
