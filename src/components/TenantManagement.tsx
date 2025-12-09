import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, X } from 'lucide-react';
import { propertyService } from '../services/propertyService';
import { useNotifications } from '../contexts/NotificationContext';

interface TenantManagementProps {
  onClose: () => void;
}

const TenantManagement: React.FC<TenantManagementProps> = ({ onClose }) => {
  const { showSuccess, showError } = useNotifications();
  const [tenants, setTenants] = useState<Array<{id: string, email: string, name: string}>>([]);
  const [showAddTenant, setShowAddTenant] = useState(false);

  // Add Tenant Form
  const [newTenant, setNewTenant] = useState({
    name: '',
    email: ''
  });

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    // Refresh from Google Sheets to get latest data (for cross-device sync)
    try {
      await propertyService.syncTenantsFromSheets();
    } catch (error) {
      console.error('Error syncing tenants:', error);
    }
    // Filter to show only active tenants
    const allTenants = propertyService.getAllTenants().filter(t => t.status === 'active');
    setTenants(allTenants);
  };

  const handleAddTenant = async () => {
    if (!newTenant.name.trim()) {
      showError('Validation Error', 'Please enter a tenant name');
      return;
    }
    
    if (!newTenant.email.trim()) {
      showError('Validation Error', 'Please enter a tenant email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newTenant.email)) {
      showError('Validation Error', 'Please enter a valid email address');
      return;
    }

    try {
      // Use empty property/unit since tenants select these when submitting issues
      await propertyService.addTenant(
        newTenant.email,
        newTenant.name,
        '', // Property will be selected when tenant submits issues
        '', // Unit will be selected when tenant submits issues
        'admin'
      );
      
      setNewTenant({ name: '', email: '' });
      setShowAddTenant(false);
      loadTenants();
      showSuccess('Success', 'Tenant added successfully!');
    } catch (error: any) {
      showError('Add Tenant Failed', error.message || `Error adding tenant: ${error}`);
    }
  };

  const handleRemoveTenant = async (tenantId: string) => {
    // For now, we'll use a simple confirmation approach
    // In a production app, you might want to implement a custom confirmation modal
    const confirmed = window.confirm('Are you sure you want to remove this tenant?');
    if (!confirmed) return;
    
    try {
      const success = await propertyService.removeTenant(tenantId);
      if (success) {
        loadTenants();
        showSuccess('Success', 'Tenant removed successfully!');
      } else {
        showError('Remove Tenant Failed', 'Failed to remove tenant');
      }
    } catch (error: any) {
      showError('Remove Tenant Failed', error.message || `Error removing tenant: ${error}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b">
          <div className="flex items-center">
            <Users className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Tenant Management</h2>
              <p className="text-xs sm:text-sm text-gray-600">Manage tenant email access to the app</p>
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
          {/* Add Tenant Button */}
          <div className="mb-6">
            <button
              onClick={() => setShowAddTenant(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Tenant
            </button>
          </div>

          {/* Tenants List */}
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-gray-900">Authorized Tenants</h4>
            {tenants.length === 0 ? (
              <p className="text-gray-500 italic">No tenants added yet</p>
            ) : (
              tenants.map(tenant => (
                <div key={tenant.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{tenant.name}</p>
                    <p className="text-sm text-gray-500">{tenant.email}</p>
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
        </div>

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
                  <p className="mt-1 text-xs text-gray-500">
                    Tenants will select their property and unit when submitting issues
                  </p>
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
      </div>
    </div>
  );
};

export default TenantManagement;