import React, { useState } from 'react';
import { X } from 'lucide-react';

interface CrewIssueFormData {
  crewName: string;
  crewEmail: string;
  address: string;
  unit: string;
  category: 'Plumbing' | 'Electrical' | 'Appliances' | 'Structural' | 'General';
  issueType: string;
  description: string;
  urgency: 'High' | 'Medium' | 'Low';
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

const ISSUE_CATEGORIES = {
  Plumbing: ['Leaking tap/faucet', 'Blocked drain', 'Toilet not flushing', 'Burst pipe'],
  Electrical: ['Power outage in unit', 'Faulty light/switch', 'Broken socket/plug', 'Tripping circuit'],
  Appliances: ['Stove not working', 'Oven not heating', 'Fridge not cooling', 'Washing machine/dryer fault'],
  Structural: ['Wall crack', 'Ceiling leak/damp', 'Broken window/door', 'Roof leak'],
  General: ['Pest infestation', 'Security concern (lock, gate, alarm)', 'Noise complaint', 'Other']
} as const;

const CrewIssueForm: React.FC<CrewIssueFormProps> = ({ onSubmit, onClose }) => {
  const [formData, setFormData] = useState<CrewIssueFormData>({
    crewName: '',
    crewEmail: '',
    address: '',
    unit: '',
    category: 'General',
    issueType: '',
    description: '',
    urgency: 'Medium'
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CrewIssueFormData, string>>>({});
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CrewIssueFormData, string>> = {};
    
    if (!formData.crewName.trim()) newErrors.crewName = 'Crew name is required';
    if (!formData.crewEmail.trim()) newErrors.crewEmail = 'Crew email is required';
    if (!formData.address) newErrors.address = 'Address is required';
    if (!formData.unit) newErrors.unit = 'Unit is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.issueType) newErrors.issueType = 'Issue type is required';
    // Description is now optional, so no validation needed

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting crew issue:', error);
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
          <h2 className="text-lg font-medium text-gray-900">Submit Crew Issue - UPDATED VERSION</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Debug info - remove this later */}
        <div className="mb-4 p-2 bg-green-100 text-green-800 text-xs rounded">
          Debug: CrewIssueForm with Category and Type fields loaded
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Crew Member Name *</label>
            <input
              type="text"
              value={formData.crewName}
              onChange={(e) => setFormData(prev => ({ ...prev, crewName: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md ${errors.crewName ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="Your name"
            />
            {errors.crewName && <p className="text-sm text-red-600">{errors.crewName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Crew Email *</label>
            <input
              type="email"
              value={formData.crewEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, crewEmail: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md ${errors.crewEmail ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="your.email@example.com"
            />
            {errors.crewEmail && <p className="text-sm text-red-600">{errors.crewEmail}</p>}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Issue Category *</label>
            <select
              value={formData.category}
              onChange={(e) => {
                setFormData(prev => ({ 
                  ...prev, 
                  category: e.target.value as 'Plumbing' | 'Electrical' | 'Appliances' | 'Structural' | 'General',
                  issueType: '' // Reset issue type when category changes
                }));
              }}
              className={`w-full px-3 py-2 border rounded-md ${errors.category ? 'border-red-300' : 'border-gray-300'}`}
            >
              <option value="">Select category</option>
              {Object.keys(ISSUE_CATEGORIES).map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            {errors.category && <p className="text-sm text-red-600">{errors.category}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Issue Type *</label>
            <select
              value={formData.issueType}
              onChange={(e) => setFormData(prev => ({ ...prev, issueType: e.target.value }))}
              disabled={!formData.category}
              className={`w-full px-3 py-2 border rounded-md ${errors.issueType ? 'border-red-300' : 'border-gray-300'}`}
            >
              <option value="">Select issue type</option>
              {formData.category && ISSUE_CATEGORIES[formData.category as keyof typeof ISSUE_CATEGORIES].map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            {errors.issueType && <p className="text-sm text-red-600">{errors.issueType}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Issue Description (Optional)</label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md ${errors.description ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="Additional details about the issue (optional)..."
            />
            {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Urgency Level *</label>
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
              {loading ? 'Submitting...' : 'Submit Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CrewIssueForm;
