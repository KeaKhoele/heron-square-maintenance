import React, { useState, useEffect, useRef } from 'react';
import { X, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { propertyService } from '../services/propertyService';
import { IssueFormData } from '../types/Issue';
import { validateImageFile } from '../services/imageService';

interface IssueFormProps {
  onSubmit: (data: IssueFormData) => Promise<void>;
  onClose: () => void;
}


const ISSUE_CATEGORIES = {
  Plumbing: ['Leaking tap/faucet', 'Blocked drain', 'Toilet not flushing', 'Burst pipe'],
  Electrical: ['Power outage in unit', 'Faulty light/switch', 'Broken socket/plug', 'Tripping circuit'],
  Appliances: ['Stove not working', 'Oven not heating', 'Fridge not cooling', 'Washing machine/dryer fault'],
  Structural: ['Wall crack', 'Ceiling leak/damp', 'Broken window/door', 'Roof leak'],
  General: ['Pest infestation', 'Security concern (lock, gate, alarm)', 'Noise complaint', 'Other']
} as const;

const IssueForm: React.FC<IssueFormProps> = ({ onSubmit, onClose }) => {
  const { currentUser } = useAuth();
  // Load properties immediately (synchronous, fast)
  const [properties] = useState<Array<{id: string, address: string, units: number}>>(() => {
    return propertyService.getAllProperties();
  });
  const [formData, setFormData] = useState<IssueFormData>(() => {
    const loadedProperties = propertyService.getAllProperties();
    return {
      name: '',
      address: loadedProperties.length > 0 ? loadedProperties[0].address : '',
      unit: '',
      category: 'General',
      issueType: '',
      description: '',
      urgency: 'Medium',
      userEmail: currentUser?.email || '',
      creatorUid: currentUser?.uid
    };
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update userEmail when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        userEmail: currentUser.email || prev.userEmail,
        creatorUid: currentUser.uid || prev.creatorUid,
      }));
    }
  }, [currentUser]);

  const [errors, setErrors] = useState<Partial<Record<keyof IssueFormData, string>>>({});
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      setImageError(validation.error || 'Invalid image file');
      setImagePreview(null);
      setFormData(prev => ({ ...prev, imageFile: undefined }));
      return;
    }

    setImageError(null);
    setFormData(prev => ({ ...prev, imageFile: file }));

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageError(null);
    setFormData(prev => ({ ...prev, imageFile: undefined }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof IssueFormData, string>> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
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
    const property = properties.find(p => p.address === address);
    if (!property) return [];
    return Array.from({ length: property.units }, (_, i) => `Unit ${i + 1}`);
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

        {/* Debug info - remove this later */}
        <div className="mb-4 p-2 bg-blue-100 text-blue-800 text-xs rounded">
          Debug: IssueForm with Category and Type fields loaded
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
              {properties.map((property) => (
                <option key={property.id} value={property.address}>
                  {property.address}
                </option>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md ${errors.description ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="Additional details about the issue (optional)..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
            <div className="mt-1 flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Maximum 50 characters. Additional details are optional.
              </p>
              <span className={`text-sm font-medium ${
                formData.description.length <= 50 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formData.description.length}/50 characters
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Photo (Optional)</label>
            <div className="space-y-2">
              {!imagePreview ? (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG up to 3MB • Camera supported</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageChange}
                  />
                </label>
              ) : (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              {imageError && (
                <p className="text-sm text-red-600">{imageError}</p>
              )}
            </div>
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
