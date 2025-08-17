'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

// Mock validation functions (will be replaced with actual validation package)
const validateTinFormat = (tin: string) => {
  const cleanTin = tin.replace(/\s/g, '').toUpperCase();
  const corporatePattern = /^C\d{10}$/;
  const individualPattern = /^\d{12}$/;
  
  if (corporatePattern.test(cleanTin)) {
    return { isValid: true, type: 'corporate', format: 'C1234567890' };
  }
  if (individualPattern.test(cleanTin)) {
    return { isValid: true, type: 'individual', format: '123456789012' };
  }
  return { 
    isValid: false, 
    type: 'unknown', 
    format: '',
    errors: ['Invalid TIN format. Use C1234567890 or 123456789012']
  };
};

const industryCategories = [
  { code: 'M', name: 'Professional Services', description: 'Legal, accounting, consulting, engineering' },
  { code: 'J', name: 'Information Technology', description: 'Software development, IT consulting' },
  { code: 'G', name: 'Retail & Wholesale', description: 'Trading, retail stores, wholesale' },
  { code: 'I', name: 'Food & Beverage', description: 'Restaurants, catering, food services' },
  { code: 'C', name: 'Manufacturing', description: 'Production, assembly, processing' },
  { code: 'F', name: 'Construction', description: 'Building, infrastructure, renovation' }
];

const commonIndustryCodes = [
  { code: '69200', description: 'Accounting, bookkeeping and auditing', category: 'M', sstApplicable: true },
  { code: '62010', description: 'Computer programming activities', category: 'J', sstApplicable: true },
  { code: '47190', description: 'Other retail sale in non-specialized stores', category: 'G', sstApplicable: false },
  { code: '56101', description: 'Restaurant activities', category: 'I', sstApplicable: false },
  { code: '71200', description: 'Engineering activities and technical consultancy', category: 'M', sstApplicable: true },
  { code: '41000', description: 'Development of building projects', category: 'F', sstApplicable: true }
];

interface OrganizationSetupWizardProps {
  onComplete: (data: any) => void;
  isLoading?: boolean;
}

export default function OrganizationSetupWizard({ onComplete, isLoading = false }: OrganizationSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Basic Information
    name: '',
    brn: '',
    contactPerson: '',
    email: '',
    phone: '',
    
    // Step 2: Tax Information
    tin: '',
    industryCode: '',
    industryDescription: '',
    
    // Step 3: SST Registration
    isSstRegistered: false,
    sstNumber: '',
    
    // Step 4: Address
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postcode: '',
      country: 'MY'
    }
  });

  const [validation, setValidation] = useState({
    tin: { isValid: false, errors: [], warnings: [] },
    industry: { isValid: false, errors: [], warnings: [] }
  });

  const [filteredIndustryCodes, setFilteredIndustryCodes] = useState(commonIndustryCodes);
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false);

  // TIN validation effect
  useEffect(() => {
    if (formData.tin) {
      const result = validateTinFormat(formData.tin);
      setValidation(prev => ({
        ...prev,
        tin: result
      }));
    }
  }, [formData.tin]);

  // Industry code search
  useEffect(() => {
    if (formData.industryCode) {
      const filtered = commonIndustryCodes.filter(code => 
        code.code.includes(formData.industryCode) ||
        code.description.toLowerCase().includes(formData.industryCode.toLowerCase())
      );
      setFilteredIndustryCodes(filtered);
    } else {
      setFilteredIndustryCodes(commonIndustryCodes);
    }
  }, [formData.industryCode]);

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const selectIndustryCode = (code: string, description: string) => {
    setFormData(prev => ({
      ...prev,
      industryCode: code,
      industryDescription: description
    }));
    setShowIndustryDropdown(false);
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(formData);
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return formData.name && formData.contactPerson && formData.email;
      case 2:
        return validation.tin.isValid && formData.industryCode;
      case 3:
        return !formData.isSstRegistered || formData.sstNumber;
      case 4:
        return formData.address.line1 && formData.address.city && formData.address.state && formData.address.postcode;
      default:
        return false;
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
            ${currentStep >= step 
              ? 'bg-primary-600 text-white' 
              : 'bg-gray-200 text-gray-600'
            }
          `}>
            {step}
          </div>
          {step < 4 && (
            <div className={`
              w-16 h-1 mx-2
              ${currentStep > step ? 'bg-primary-600' : 'bg-gray-200'}
            `} />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Company Name *
          </label>
          <input
            type="text"
            required
            className="input mt-1"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Your Company Sdn Bhd"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Business Registration Number
          </label>
          <input
            type="text"
            className="input mt-1"
            value={formData.brn}
            onChange={(e) => handleInputChange('brn', e.target.value)}
            placeholder="123456-X"
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
            placeholder="John Doe"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email Address *
          </label>
          <input
            type="email"
            required
            className="input mt-1"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="contact@company.com"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Phone Number
          </label>
          <input
            type="tel"
            className="input mt-1"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="+60 12-345 6789"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Tax Information</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Malaysian TIN (Tax Identification Number) *
        </label>
        <input
          type="text"
          required
          className={`input mt-1 ${
            formData.tin && !validation.tin.isValid ? 'border-red-300' : ''
          }`}
          value={formData.tin}
          onChange={(e) => handleInputChange('tin', e.target.value)}
          placeholder="C1234567890 or 123456789012"
        />
        
        {formData.tin && !validation.tin.isValid && (
          <div className="mt-2 text-sm text-red-600">
            {validation.tin.errors?.map((error, index) => (
              <p key={index}>{error}</p>
            ))}
          </div>
        )}
        
        {validation.tin.isValid && (
          <div className="mt-2 text-sm text-green-600">
            ✓ Valid {validation.tin.type} TIN format
          </div>
        )}
      </div>
      
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700">
          Industry Code (MSIC) *
        </label>
        <input
          type="text"
          required
          className="input mt-1"
          value={formData.industryCode}
          onChange={(e) => {
            handleInputChange('industryCode', e.target.value);
            setShowIndustryDropdown(true);
          }}
          onFocus={() => setShowIndustryDropdown(true)}
          placeholder="Search industry code or description"
        />
        
        {showIndustryDropdown && filteredIndustryCodes.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md border border-gray-300 overflow-auto">
            {filteredIndustryCodes.map((code) => (
              <div
                key={code.code}
                className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                onClick={() => selectIndustryCode(code.code, code.description)}
              >
                <div className="font-medium text-gray-900">{code.code}</div>
                <div className="text-sm text-gray-600">{code.description}</div>
                {code.sstApplicable && (
                  <div className="text-xs text-blue-600">SST Applicable</div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {formData.industryDescription && (
          <div className="mt-2 text-sm text-gray-600">
            Selected: {formData.industryDescription}
          </div>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">SST Registration</h3>
      
      <div className="bg-blue-50 p-4 rounded-md">
        <div className="flex">
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800">
              About SST (Services and Sales Tax)
            </h4>
            <div className="mt-2 text-sm text-blue-700">
              <p>SST is a 6% tax applicable to certain services and goods in Malaysia. 
                 If your business provides taxable services or sells taxable goods with annual revenue above the threshold, 
                 you need to register for SST.</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="sstRegistered"
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            checked={formData.isSstRegistered}
            onChange={(e) => handleInputChange('isSstRegistered', e.target.checked)}
          />
          <label htmlFor="sstRegistered" className="ml-3 block text-sm text-gray-900">
            My business is registered for SST (6% Services and Sales Tax)
          </label>
        </div>
        
        {formData.isSstRegistered && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              SST Registration Number *
            </label>
            <input
              type="text"
              required
              className="input mt-1"
              value={formData.sstNumber}
              onChange={(e) => handleInputChange('sstNumber', e.target.value)}
              placeholder="SST-1234-5678-9012"
            />
            <p className="mt-1 text-sm text-gray-500">
              Your SST registration number as issued by Royal Malaysian Customs Department
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Business Address</h3>
      
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Address Line 1 *
          </label>
          <input
            type="text"
            required
            className="input mt-1"
            value={formData.address.line1}
            onChange={(e) => handleInputChange('address.line1', e.target.value)}
            placeholder="Street address, building name, unit number"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Address Line 2
          </label>
          <input
            type="text"
            className="input mt-1"
            value={formData.address.line2}
            onChange={(e) => handleInputChange('address.line2', e.target.value)}
            placeholder="Additional address information (optional)"
          />
        </div>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              City *
            </label>
            <input
              type="text"
              required
              className="input mt-1"
              value={formData.address.city}
              onChange={(e) => handleInputChange('address.city', e.target.value)}
              placeholder="Kuala Lumpur"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              State *
            </label>
            <select
              required
              className="input mt-1"
              value={formData.address.state}
              onChange={(e) => handleInputChange('address.state', e.target.value)}
            >
              <option value="">Select State</option>
              <option value="Johor">Johor</option>
              <option value="Kedah">Kedah</option>
              <option value="Kelantan">Kelantan</option>
              <option value="Kuala Lumpur">Kuala Lumpur</option>
              <option value="Labuan">Labuan</option>
              <option value="Melaka">Melaka</option>
              <option value="Negeri Sembilan">Negeri Sembilan</option>
              <option value="Pahang">Pahang</option>
              <option value="Penang">Penang</option>
              <option value="Perak">Perak</option>
              <option value="Perlis">Perlis</option>
              <option value="Putrajaya">Putrajaya</option>
              <option value="Sabah">Sabah</option>
              <option value="Sarawak">Sarawak</option>
              <option value="Selangor">Selangor</option>
              <option value="Terengganu">Terengganu</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Postcode *
            </label>
            <input
              type="text"
              required
              className="input mt-1"
              value={formData.address.postcode}
              onChange={(e) => handleInputChange('address.postcode', e.target.value)}
              placeholder="50000"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      {renderStepIndicator()}
      
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white shadow-sm rounded-lg p-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>
        
        <div className="flex justify-between">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="btn-secondary"
          >
            Previous
          </button>
          
          {currentStep < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={!isStepValid(currentStep)}
              className="btn-primary"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={!isStepValid(currentStep) || isLoading}
              className="btn-primary"
            >
              {isLoading ? 'Setting up...' : 'Complete Setup'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}