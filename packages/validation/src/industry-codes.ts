/**
 * Malaysian Standard Industrial Classification (MSIC) codes
 * Based on MSIC 2008 Version 1.0 by Department of Statistics Malaysia
 */

export interface IndustryCode {
  code: string;
  description: string;
  category: string;
  section: string;
  allowsB2cConsolidation: boolean;
  sstApplicable: boolean;
  notes?: string;
}

export interface IndustrySection {
  code: string;
  title: string;
  description: string;
}

export const INDUSTRY_SECTIONS: IndustrySection[] = [
  {
    code: 'A',
    title: 'Agriculture, Forestry and Fishing',
    description: 'Crop and animal production, hunting and related service activities'
  },
  {
    code: 'B',
    title: 'Mining and Quarrying',
    description: 'Extraction of crude petroleum and natural gas'
  },
  {
    code: 'C',
    title: 'Manufacturing',
    description: 'Food products, textiles, chemicals, electronics, etc.'
  },
  {
    code: 'D',
    title: 'Electricity, Gas, Steam and Air Conditioning Supply',
    description: 'Electric power generation, transmission and distribution'
  },
  {
    code: 'E',
    title: 'Water Supply; Sewerage, Waste Management',
    description: 'Water collection, treatment, supply and waste management'
  },
  {
    code: 'F',
    title: 'Construction',
    description: 'Building construction, civil engineering, specialized activities'
  },
  {
    code: 'G',
    title: 'Wholesale and Retail Trade',
    description: 'Motor vehicles, motorcycles, retail and wholesale trade'
  },
  {
    code: 'H',
    title: 'Transportation and Storage',
    description: 'Land, water, air transport and warehousing'
  },
  {
    code: 'I',
    title: 'Accommodation and Food Service Activities',
    description: 'Hotels, restaurants, catering and other food services'
  },
  {
    code: 'J',
    title: 'Information and Communication',
    description: 'Publishing, telecommunications, computer programming'
  },
  {
    code: 'K',
    title: 'Financial and Insurance Activities',
    description: 'Banking, insurance, funds and other financial services'
  },
  {
    code: 'L',
    title: 'Real Estate Activities',
    description: 'Real estate buying, selling, renting and development'
  },
  {
    code: 'M',
    title: 'Professional, Scientific and Technical Activities',
    description: 'Legal, accounting, consulting, architectural, engineering'
  },
  {
    code: 'N',
    title: 'Administrative and Support Service Activities',
    description: 'Business support services, travel agencies, security'
  },
  {
    code: 'O',
    title: 'Public Administration and Defence',
    description: 'Government administration, defence, social security'
  },
  {
    code: 'P',
    title: 'Education',
    description: 'Pre-primary, primary, secondary, higher education'
  },
  {
    code: 'Q',
    title: 'Human Health and Social Work Activities',
    description: 'Hospital, medical, dental, social work activities'
  },
  {
    code: 'R',
    title: 'Arts, Entertainment and Recreation',
    description: 'Creative arts, libraries, sports, amusement activities'
  },
  {
    code: 'S',
    title: 'Other Service Activities',
    description: 'Professional organizations, repair services, personal care'
  },
  {
    code: 'T',
    title: 'Household Activities',
    description: 'Households as employers of domestic personnel'
  },
  {
    code: 'U',
    title: 'International Organizations',
    description: 'Activities of extraterritorial organizations'
  }
];

// Common industry codes relevant to e-Invoice compliance
export const COMMON_INDUSTRY_CODES: IndustryCode[] = [
  // Professional Services
  {
    code: '69100',
    description: 'Legal activities',
    category: 'Professional Services',
    section: 'M',
    allowsB2cConsolidation: true,
    sstApplicable: true
  },
  {
    code: '69200',
    description: 'Accounting, bookkeeping and auditing activities',
    category: 'Professional Services',
    section: 'M',
    allowsB2cConsolidation: true,
    sstApplicable: true
  },
  {
    code: '70100',
    description: 'Activities of head offices',
    category: 'Professional Services',
    section: 'M',
    allowsB2cConsolidation: true,
    sstApplicable: true
  },
  {
    code: '71100',
    description: 'Architectural activities',
    category: 'Professional Services',
    section: 'M',
    allowsB2cConsolidation: true,
    sstApplicable: true
  },
  {
    code: '71200',
    description: 'Engineering activities and related technical consultancy',
    category: 'Professional Services',
    section: 'M',
    allowsB2cConsolidation: true,
    sstApplicable: true
  },
  {
    code: '62010',
    description: 'Computer programming activities',
    category: 'Information Technology',
    section: 'J',
    allowsB2cConsolidation: true,
    sstApplicable: true
  },
  {
    code: '62020',
    description: 'Computer consultancy activities',
    category: 'Information Technology',
    section: 'J',
    allowsB2cConsolidation: true,
    sstApplicable: true
  },

  // Retail and Wholesale
  {
    code: '47190',
    description: 'Other retail sale in non-specialized stores',
    category: 'Retail Trade',
    section: 'G',
    allowsB2cConsolidation: true,
    sstApplicable: false
  },
  {
    code: '46690',
    description: 'Wholesale of other machinery and equipment',
    category: 'Wholesale Trade',
    section: 'G',
    allowsB2cConsolidation: true,
    sstApplicable: false
  },

  // Food and Beverage
  {
    code: '56101',
    description: 'Restaurant activities',
    category: 'Food & Beverage',
    section: 'I',
    allowsB2cConsolidation: true,
    sstApplicable: false,
    notes: 'Consider transaction volume limits for consolidation'
  },
  {
    code: '56102',
    description: 'Fast food activities',
    category: 'Food & Beverage',
    section: 'I',
    allowsB2cConsolidation: true,
    sstApplicable: false
  },

  // Manufacturing
  {
    code: '10790',
    description: 'Manufacture of other food products',
    category: 'Manufacturing',
    section: 'C',
    allowsB2cConsolidation: true,
    sstApplicable: false
  },

  // Construction
  {
    code: '41000',
    description: 'Development of building projects',
    category: 'Construction',
    section: 'F',
    allowsB2cConsolidation: true,
    sstApplicable: true
  },
  {
    code: '42100',
    description: 'Construction of roads and railways',
    category: 'Construction',
    section: 'F',
    allowsB2cConsolidation: true,
    sstApplicable: true
  },

  // Prohibited industries for B2C consolidation
  {
    code: '35101',
    description: 'Electric power generation',
    category: 'Utilities',
    section: 'D',
    allowsB2cConsolidation: false,
    sstApplicable: false,
    notes: 'B2C consolidation not allowed'
  },
  {
    code: '35102',
    description: 'Electric power transmission',
    category: 'Utilities',
    section: 'D',
    allowsB2cConsolidation: false,
    sstApplicable: false,
    notes: 'B2C consolidation not allowed'
  },
  {
    code: '35103',
    description: 'Electric power distribution',
    category: 'Utilities',
    section: 'D',
    allowsB2cConsolidation: false,
    sstApplicable: false,
    notes: 'B2C consolidation not allowed'
  },
  {
    code: '36000',
    description: 'Water collection, treatment and supply',
    category: 'Utilities',
    section: 'E',
    allowsB2cConsolidation: false,
    sstApplicable: false,
    notes: 'B2C consolidation not allowed'
  },
  {
    code: '37000',
    description: 'Sewerage',
    category: 'Utilities',
    section: 'E',
    allowsB2cConsolidation: false,
    sstApplicable: false,
    notes: 'B2C consolidation not allowed'
  },
  {
    code: '61',
    description: 'Telecommunications',
    category: 'Telecommunications',
    section: 'J',
    allowsB2cConsolidation: false,
    sstApplicable: true,
    notes: 'B2C consolidation not allowed'
  },
  {
    code: '52211',
    description: 'Parking services',
    category: 'Transportation',
    section: 'H',
    allowsB2cConsolidation: false,
    sstApplicable: false,
    notes: 'B2C consolidation not allowed'
  },
  {
    code: '52212',
    description: 'Toll road operations',
    category: 'Transportation',
    section: 'H',
    allowsB2cConsolidation: false,
    sstApplicable: false,
    notes: 'B2C consolidation not allowed'
  },
  {
    code: '84',
    description: 'Public administration and defence services',
    category: 'Government',
    section: 'O',
    allowsB2cConsolidation: false,
    sstApplicable: false,
    notes: 'B2C consolidation not allowed'
  }
];

/**
 * Search industry codes by description or code
 */
export function searchIndustryCodes(query: string): IndustryCode[] {
  const searchTerm = query.toLowerCase();
  
  return COMMON_INDUSTRY_CODES.filter(code => 
    code.code.toLowerCase().includes(searchTerm) ||
    code.description.toLowerCase().includes(searchTerm) ||
    code.category.toLowerCase().includes(searchTerm)
  );
}

/**
 * Get industry code by exact code
 */
export function getIndustryCode(code: string): IndustryCode | undefined {
  return COMMON_INDUSTRY_CODES.find(ic => ic.code === code);
}

/**
 * Get industry codes by category
 */
export function getIndustryCodesByCategory(category: string): IndustryCode[] {
  return COMMON_INDUSTRY_CODES.filter(code => code.category === category);
}

/**
 * Get industry codes by section
 */
export function getIndustryCodesBySection(section: string): IndustryCode[] {
  return COMMON_INDUSTRY_CODES.filter(code => code.section === section);
}

/**
 * Get all unique categories
 */
export function getIndustryCategories(): string[] {
  const categories = COMMON_INDUSTRY_CODES.map(code => code.category);
  return [...new Set(categories)].sort();
}

/**
 * Check if industry allows B2C consolidation
 */
export function isB2cConsolidationAllowed(industryCode: string): {
  allowed: boolean;
  reason?: string;
  restrictions?: string[];
} {
  const industry = getIndustryCode(industryCode);
  
  if (!industry) {
    return {
      allowed: true, // Allow unknown codes with caution
      reason: 'Industry code not found in database - proceed with caution',
      restrictions: ['Verify with LHDN if consolidation is permitted for your industry']
    };
  }
  
  if (!industry.allowsB2cConsolidation) {
    return {
      allowed: false,
      reason: industry.notes || 'B2C consolidation not permitted for this industry',
      restrictions: ['Issue individual invoices for each transaction']
    };
  }
  
  // Add specific restrictions for certain industries
  const restrictions: string[] = [];
  
  if (industry.category === 'Food & Beverage') {
    restrictions.push('Consider monthly transaction volume limits');
    restrictions.push('Maximum recommended: 200 transactions per consolidated invoice');
  }
  
  if (industry.category === 'Retail Trade') {
    restrictions.push('Consider transaction value limits');
    restrictions.push('Maximum recommended: RM50,000 per consolidated invoice');
  }
  
  return {
    allowed: true,
    restrictions: restrictions.length > 0 ? restrictions : undefined
  };
}

/**
 * Check if SST is applicable for industry
 */
export function isSstApplicable(industryCode: string): boolean {
  const industry = getIndustryCode(industryCode);
  return industry?.sstApplicable ?? false;
}

/**
 * Get industry section information
 */
export function getIndustrySection(sectionCode: string): IndustrySection | undefined {
  return INDUSTRY_SECTIONS.find(section => section.code === sectionCode);
}