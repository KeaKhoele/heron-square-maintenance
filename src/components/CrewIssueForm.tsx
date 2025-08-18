import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAccessControl } from '../contexts/AccessControlContext';

interface CrewIssueFormData {
  crewName: string;
  address: string;
  unit: string;
  description: string;
  urgency: 'High' | 'Medium' | 'Low';
  crewEmail: string;
}

interface CrewIssueFormProps {
  onSubmit: (data: CrewIssueFormData) => Promise<void>;
  onClose: () => void;
}

const ADDRESSES = {
  '34 Arnold Street': 10,
  '8 Arnold Street': 6,
  '186 Cole Street': 16,
  '5 Franklin Road': 17,
  '2 Grant Street': 3,
  '11 Highbury Road': 9,
  '11 Lower Scott Road': 4,
  '4 Lynton Road': 6,
  '6 Lynton Road': 6,
  '6 St Micheal': 3,
  '1 Nelson Road': 5,
  '3 Nelson Road': 4,
  '4 Nelson Road': 4,
  '5 Nelson Road': 4,
  '6 Nelson Road': 4,
  '7 Nelson Road': 4,
  '8 Nelson Road': 4,
  '9 Nelson Road': 4,
  '79 Lower Main Road': 23,
  '4 Roman Road': 5,
  '6 Roman Road': 12,
  '3 Scott Road': 5,
  '17 Stanley Road': 19,
  '17 Stanley Road Flatlet': 1,
  '21 Stanley Road': 15,
  '25 Stanley Road': 7,
  '25A Stanley Road': 2,
  '5 Station Road': 21,
};

const CrewIssueForm: React.FC<CrewIssueFormProps> = ({ onSubmit, onClose }) => {
  const { crewSession } = useAccessControl();
  const [formData, setFormData] = useState<CrewIssueFormData>({
    crewName: crewSession?.name || '',
    address: '',
    unit: '',
    description: '',
    urgency: 'Medium',
    crewEmail: crewSession?.email || ''
  });

  // Update crew info when crewSession changes
  useEffect(() => {
    if (crewSession) {
      setFormData(prev => ({ 
        ...prev, 
        crewName: crewSession.name || '',
        crewEmail: crewSession.email || ''
      }));
    }
  }, [crewSession]);

  const [errors, setErrors] = useState<Partial<CrewIssueFormData>>({});
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<CrewIssueFormData> = {};
    
    if (!formData.crewName.trim()) newErrors.crewName = 'Crew name is required';
    if (!formData.address) newErrors.address = 'Address is required';
    if (!formData.unit) newErrors.unit = 'Unit is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (formData.description.trim().length > 30) {
      newErrors.description = 'Description cannot exceed 30 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      console.log('Form validation failed, not submitting');
      return; // Stop submission if validation fails
    }

    try {
      setLoading(true);
      await onSubmit(formData);
    } catch (error: any) {
      console.error('Error submitting crew issue:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateUnits = (address: string) => {
    const unitCount = ADDRESSES[address as keyof typeof ADDRESSES] || 0;
    const units = [];
    for (let i = 1; i <= unitCount; i++) {
      units.push(i.toString());
    }
    return units;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            Submit Maintenance Issue (Crew)
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Crew Name */}
            <div>
              <label htmlFor="crewName" className="block text-sm font-medium text-gray-700 mb-2">
                Crew Name and Surname *
              </label>
              <input
                type="text"
                id="crewName"
                value={formData.crewName}
                onChange={(e) => setFormData(prev => ({ ...prev, crewName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter crew member name"
              />
              {errors.crewName && (
                <p className="mt-1 text-sm text-red-600">{errors.crewName}</p>
              )}
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                Address *
              </label>
              <select
                id="address"
                value={formData.address}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, address: e.target.value, unit: '' }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select an address</option>
                {Object.keys(ADDRESSES).map((address) => (
                  <option key={address} value={address}>
                    {address}
                  </option>
                ))}
              </select>
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address}</p>
              )}
            </div>

            {/* Unit */}
            <div>
              <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-2">
                Unit *
              </label>
              <select
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!formData.address}
              >
                <option value="">Select a unit</option>
                {formData.address && generateUnits(formData.address).map((unit) => (
                  <option key={unit} value={unit}>
                    Unit {unit}
                  </option>
                ))}
              </select>
              {errors.unit && (
                <p className="mt-1 text-sm text-red-600">{errors.unit}</p>
              )}
            </div>

            {/* Urgency */}
            <div>
              <label htmlFor="urgency" className="block text-sm font-medium text-gray-700 mb-2">
                Urgency Level *
              </label>
              <select
                id="urgency"
                value={formData.urgency}
                onChange={(e) => setFormData(prev => ({ ...prev, urgency: e.target.value as 'High' | 'Medium' | 'Low' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Issue Description *
            </label>
            <textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe the maintenance issue in detail..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
            <div className="mt-1 flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Maximum 30 characters. Be as detailed as possible.
              </p>
              <span className={`text-sm font-medium ${
                formData.description.length <= 30 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formData.description.length}/30 characters
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CrewIssueForm;
