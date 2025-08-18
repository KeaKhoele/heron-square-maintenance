import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface IssueFormData {
  name: string;
  address: string;
  unit: string;
  description: string;
  urgency: 'High' | 'Medium' | 'Low';
  userEmail: string;
}

interface IssueFormProps {
  onSubmit: (data: IssueFormData) => Promise<void>;
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

const IssueForm: React.FC<IssueFormProps> = ({ onSubmit, onClose }) => {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState<IssueFormData>({
    name: '',
    address: '',
    unit: '',
    description: '',
    urgency: 'Medium',
    userEmail: currentUser?.email || ''
  });

  // Update userEmail when currentUser changes
  useEffect(() => {
    if (currentUser?.email) {
      setFormData(prev => ({ ...prev, userEmail: currentUser.email || '' }));
    }
  }, [currentUser?.email]);

  const [errors, setErrors] = useState<Partial<IssueFormData>>({});
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<IssueFormData> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
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
    } catch (error) {
      console.error('Error submitting issue:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateUnits = (address: string) => {
    const count = ADDRESSES[address as keyof typeof ADDRESSES] || 0;
    return Array.from({ length: count }, (_, i) => `Unit ${i + 1}`);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Log New Issue</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md ${errors.name ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="Full name"
            />
            {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
            <select
              value={formData.address}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, address: e.target.value, unit: '' }));
              }}
              className={`w-full px-3 py-2 border rounded-md ${errors.address ? 'border-red-300' : 'border-gray-300'}`}
            >
              <option value="">Select address</option>
              {Object.keys(ADDRESSES).map((address) => (
                <option key={address} value={address}>{address}</option>
              ))}
            </select>
            {errors.address && <p className="text-sm text-red-600">{errors.address}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
            <select
              value={formData.unit}
              onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
              disabled={!formData.address}
              className={`w-full px-3 py-2 border rounded-md ${errors.unit ? 'border-red-300' : 'border-gray-300'}`}
            >
              <option value="">Select unit</option>
              {formData.address && generateUnits(formData.address).map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
            {errors.unit && <p className="text-sm text-red-600">{errors.unit}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md ${errors.description ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="Describe the issue..."
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Urgency *</label>
            <select
              value={formData.urgency}
              onChange={(e) => setFormData(prev => ({ ...prev, urgency: e.target.value as 'High' | 'Medium' | 'Low' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IssueForm;