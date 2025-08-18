'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { useForm, useFieldArray } from 'react-hook-form';
import { 
  PlusIcon, 
  TrashIcon,
  StarIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface TemplateFormData {
  name: string;
  description: string;
  category: 'general' | 'professional-services' | 'retail' | 'manufacturing' | 'hospitality' | 'technology';
  isPublic: boolean;
  templateData: {
    eInvoiceType: '01' | '02' | '03' | '04';
    currency: 'MYR' | 'USD' | 'EUR' | 'SGD';
    paymentTermsDays: number;
    defaultLineItems: Array<{
      itemDescription: string;
      quantity: string;
      unitPrice: string;
      sstRate: string;
      category?: string;
    }>;
    businessSettings: {
      defaultNotes: string;
      autoCalculateSST: boolean;
      requirePONumber: boolean;
      defaultDiscountRate: string;
    };
    industrySpecific: Record<string, any>;
  };
}

interface IndustryPreset {
  category: string;
  name: string;
  description: string;
  defaultLineItems: Array<{
    itemDescription: string;
    quantity: string;
    unitPrice: string;
    sstRate: string;
  }>;
  businessSettings: {
    defaultNotes: string;
    autoCalculateSST: boolean;
    requirePONumber: boolean;
  };
}

const CATEGORIES = [
  { value: 'general', label: 'General', description: 'Suitable for any type of business' },
  { value: 'professional-services', label: 'Professional Services', description: 'Consulting, legal, accounting services' },
  { value: 'retail', label: 'Retail', description: 'Product sales and retail businesses' },
  { value: 'manufacturing', label: 'Manufacturing', description: 'Manufacturing and production' },
  { value: 'hospitality', label: 'Hospitality', description: 'Hotels, restaurants, hospitality' },
  { value: 'technology', label: 'Technology', description: 'IT services and software development' },
];

const CURRENCIES = [
  { value: 'MYR', label: 'Malaysian Ringgit (MYR)' },
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'SGD', label: 'Singapore Dollar (SGD)' },
];

const INVOICE_TYPES = [
  { value: '01', label: 'Invoice' },
  { value: '02', label: 'Credit Note' },
  { value: '03', label: 'Debit Note' },
  { value: '04', label: 'Refund Note' },
];

export default function CreateTemplatePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [industryPresets, setIndustryPresets] = useState<IndustryPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<IndustryPreset | null>(null);

  const { user } = useAuth();
  const router = useRouter();

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<TemplateFormData>({
    defaultValues: {
      name: '',
      description: '',
      category: 'general',
      isPublic: false,
      templateData: {
        eInvoiceType: '01',
        currency: 'MYR',
        paymentTermsDays: 30,
        defaultLineItems: [
          {
            itemDescription: '',
            quantity: '1.000',
            unitPrice: '0.00',
            sstRate: '6.00',
            category: '',
          }
        ],
        businessSettings: {
          defaultNotes: '',
          autoCalculateSST: true,
          requirePONumber: false,
          defaultDiscountRate: '0.00',
        },
        industrySpecific: {},
      },
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'templateData.defaultLineItems',
  });

  const watchedCategory = watch('templateData.category') || watch('category');

  useEffect(() => {
    fetchIndustryPresets();
  }, []);

  useEffect(() => {
    if (watchedCategory) {
      fetchCategoryPreset(watchedCategory);
    }
  }, [watchedCategory]);

  const fetchIndustryPresets = async () => {
    try {
      const response = await api.templates.getPresets();
      setIndustryPresets(response.presets || []);
    } catch (error: any) {
      console.error('Failed to fetch presets:', error);
    }
  };

  const fetchCategoryPreset = async (category: string) => {
    try {
      const response = await api.templates.getPresets(category);
      if (response.preset) {
        setSelectedPreset(response.preset);
      }
    } catch (error: any) {
      console.error('Failed to fetch category preset:', error);
    }
  };

  const applyPreset = () => {
    if (!selectedPreset) return;

    // Apply preset values to form
    setValue('templateData.defaultLineItems', selectedPreset.defaultLineItems);
    setValue('templateData.businessSettings.defaultNotes', selectedPreset.businessSettings.defaultNotes);
    setValue('templateData.businessSettings.autoCalculateSST', selectedPreset.businessSettings.autoCalculateSST);
    setValue('templateData.businessSettings.requirePONumber', selectedPreset.businessSettings.requirePONumber);
    
    setSuccess('Industry preset applied successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const onSubmit = async (data: TemplateFormData) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.templates.create({
        name: data.name,
        description: data.description,
        category: data.category,
        isPublic: data.isPublic,
        templateData: data.templateData,
      });

      setSuccess('Template created successfully!');
      setTimeout(() => {
        router.push('/templates');
      }, 1500);
    } catch (error: any) {
      console.error('Template creation failed:', error);
      setError(error.message || 'Failed to create template');
    } finally {
      setIsLoading(false);
    }
  };

  const addLineItem = () => {
    append({
      itemDescription: '',
      quantity: '1.000',
      unitPrice: '0.00',
      sstRate: '6.00',
      category: '',
    });
  };

  if (!user?.hasCompletedOnboarding) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Organization Setup Required
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Complete your organization setup before creating templates.</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => router.push('/org/setup')}
                    className="bg-yellow-50 px-2 py-1.5 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-100"
                  >
                    Complete Setup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create Template</h1>
              <p className="mt-2 text-gray-600">
                Create a reusable invoice template to streamline your invoicing process
              </p>
            </div>
            <button
              onClick={() => router.push('/templates')}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Success</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>{success}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  {...register('name', { required: 'Template name is required' })}
                  className="input"
                  placeholder="e.g., Standard Service Invoice"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  {...register('category', { required: 'Category is required' })}
                  className="input"
                >
                  {CATEGORIES.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="input"
                placeholder="Brief description of when to use this template..."
              />
            </div>

            <div className="mt-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('isPublic')}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Make this template public (visible to other users)
                </span>
                <StarIcon className="h-4 w-4 ml-1 text-yellow-400" />
              </label>
            </div>
          </div>

          {/* Industry Preset */}
          {selectedPreset && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex">
                  <LightBulbIcon className="h-5 w-5 text-blue-400 mt-0.5 mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-800">Industry Preset Available</h3>
                    <p className="mt-1 text-sm text-blue-700">
                      We have a preset for {selectedPreset.name} category with pre-configured settings.
                    </p>
                    <p className="mt-1 text-xs text-blue-600">
                      {selectedPreset.description}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={applyPreset}
                  className="ml-3 bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded text-sm font-medium"
                >
                  Apply Preset
                </button>
              </div>
            </div>
          )}

          {/* Invoice Settings */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Settings</h3>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Type
                </label>
                <select
                  {...register('templateData.eInvoiceType')}
                  className="input"
                >
                  {INVOICE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Currency
                </label>
                <select
                  {...register('templateData.currency')}
                  className="input"
                >
                  {CURRENCIES.map(currency => (
                    <option key={currency.value} value={currency.value}>
                      {currency.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Terms (Days)
                </label>
                <input
                  type="number"
                  {...register('templateData.paymentTermsDays', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Must be positive' },
                    max: { value: 365, message: 'Maximum 365 days' }
                  })}
                  className="input"
                  min="0"
                  max="365"
                />
                {errors.templateData?.paymentTermsDays && (
                  <p className="mt-1 text-sm text-red-600">{errors.templateData.paymentTermsDays.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Default Line Items */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Default Line Items</h3>
              <button
                type="button"
                onClick={addLineItem}
                className="btn-secondary flex items-center text-sm"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 gap-4 p-4 border border-gray-200 rounded-lg md:grid-cols-5">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description *
                    </label>
                    <input
                      type="text"
                      {...register(`templateData.defaultLineItems.${index}.itemDescription`, {
                        required: 'Description is required'
                      })}
                      className="input"
                      placeholder="Item or service description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="text"
                      {...register(`templateData.defaultLineItems.${index}.quantity`)}
                      className="input"
                      placeholder="1.000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Price (MYR)
                    </label>
                    <input
                      type="text"
                      {...register(`templateData.defaultLineItems.${index}.unitPrice`)}
                      className="input"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="flex items-end space-x-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SST Rate (%)
                      </label>
                      <input
                        type="text"
                        {...register(`templateData.defaultLineItems.${index}.sstRate`)}
                        className="input"
                        placeholder="6.00"
                      />
                    </div>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="p-2 text-red-600 hover:text-red-700"
                        title="Remove item"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Business Settings */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Business Settings</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Notes
                </label>
                <textarea
                  {...register('templateData.businessSettings.defaultNotes')}
                  rows={3}
                  className="input"
                  placeholder="Default notes or terms that appear on invoices..."
                />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Discount Rate (%)
                  </label>
                  <input
                    type="text"
                    {...register('templateData.businessSettings.defaultDiscountRate')}
                    className="input"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('templateData.businessSettings.autoCalculateSST')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Automatically calculate SST (6%)
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('templateData.businessSettings.requirePONumber')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Require Purchase Order (PO) number
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/templates')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
            >
              {isLoading ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}