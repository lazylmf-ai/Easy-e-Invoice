'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

export default function OrganizationSetupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    tin: '',
    industryCode: '',
    isSstRegistered: false,
    sstNumber: '',
    contactPerson: '',
    phone: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postcode: '',
      country: 'MY',
    },
  });
  
  const { refreshUser } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Implement organization setup API call
      console.log('Setting up organization:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await refreshUser();
      router.push('/dashboard');
    } catch (error) {
      console.error('Organization setup failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Organization Setup</h1>
          <p className="mt-2 text-gray-600">
            Set up your organization for Malaysian e-Invoice compliance
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium">Basic Information</h3>
            </div>
            <div className="card-body space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="input mt-1"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Malaysian TIN *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="C1234567890 or 123456789012"
                    className="input mt-1"
                    value={formData.tin}
                    onChange={(e) => handleInputChange('tin', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Industry Code (MSIC)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 62010"
                    className="input mt-1"
                    value={formData.industryCode}
                    onChange={(e) => handleInputChange('industryCode', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Contact Person *
                  </label>
                  <input
                    type="text"
                    required
                    className="input mt-1"
                    value={formData.contactPerson}
                    onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SST Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium">SST Registration</h3>
            </div>
            <div className="card-body space-y-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="sstRegistered"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  checked={formData.isSstRegistered}
                  onChange={(e) => handleInputChange('isSstRegistered', e.target.checked)}
                />
                <label htmlFor="sstRegistered" className="ml-2 block text-sm text-gray-900">
                  My business is registered for SST (6% Services and Sales Tax)
                </label>
              </div>
              
              {formData.isSstRegistered && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    SST Registration Number
                  </label>
                  <input
                    type="text"
                    className="input mt-1"
                    value={formData.sstNumber}
                    onChange={(e) => handleInputChange('sstNumber', e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
            >
              {isLoading ? 'Setting up...' : 'Complete Setup'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}